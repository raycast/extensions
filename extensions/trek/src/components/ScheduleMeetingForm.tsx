import {
  Action,
  ActionPanel,
  Form,
  Toast,
  Icon,
  showHUD,
  PopToRootType,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise, showFailureToast, useCachedState } from "@raycast/utils";
import { scheduleMeeting, getProjectPeople, fetchSchedules, fetchAccounts, fetchProjects } from "../oauth/auth";
import { showToast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { BasecampPerson, BasecampProject } from "../utils/types";
import { addHours } from "date-fns";

// Define the preferences interface
interface Preferences {
  copyMeetingUrl: boolean;
}

interface Schedule {
  id: number;
  title: string;
  url: string;
  app_url: string;
}

interface FormErrors {
  accountId?: string;
  projectId?: string;
  summary?: string;
  startDateTime?: string;
  endDateTime?: string;
  scheduleId?: string;
}

interface FormValues {
  accountId: string;
  projectId: string;
  summary: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  allDay: boolean;
  scheduleId: string;
  participantIds: string[];
  notifyParticipants: boolean;
  url?: string;
}

export default function ScheduleMeetingForm() {
  const [projectPeople, setProjectPeople] = useState<BasecampPerson[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const summaryFieldRef = useRef<Form.TextField>(null);
  const isInitializedRef = useRef<boolean>(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Use cached state for persistent values
  const [savedAccountId, setSavedAccountId] = useCachedState<string>("basecamp-account-id-schedule", "");
  const [savedProjectId, setSavedProjectId] = useCachedState<string>("basecamp-project-id-schedule", "");
  const [savedScheduleId, setSavedScheduleId] = useCachedState<string>("basecamp-schedule-id-schedule", "");

  // Set default start time to now and end time to 1 hour from now
  const now = new Date();
  const oneHourLater = addHours(now, 1);

  // Initialize form state
  const [formValues, setFormValues] = useState<FormValues>({
    accountId: savedAccountId || "",
    projectId: savedProjectId || "",
    startDateTime: now,
    endDateTime: oneHourLater,
    allDay: false,
    participantIds: [],
    notifyParticipants: true,
    scheduleId: savedScheduleId || "",
    summary: "",
    description: "",
  });

  const validateForm = useMemo(() => {
    const errors: FormErrors = {};

    if (!formValues.accountId) {
      errors.accountId = "Account is required";
    }
    if (!formValues.projectId) {
      errors.projectId = "Project is required";
    }
    if (!formValues.scheduleId) {
      errors.scheduleId = "Schedule is required";
    }
    if (!formValues.summary.trim()) {
      errors.summary = "Title is required";
    }
    if (!formValues.startDateTime) {
      errors.startDateTime = "Start date/time is required";
    }
    if (!formValues.endDateTime) {
      errors.endDateTime = "End date/time is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formValues]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Required Fields",
        message: "Please fill in all required fields",
      });
      return;
    }

    if (!formValues.startDateTime || !formValues.endDateTime) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Date/Time",
        message: "Please select start and end times for the meeting",
      });
      return;
    }

    try {
      // Get preferences
      const preferences = getPreferenceValues<Preferences>();

      // Format dates based on whether it's an all-day event or not
      let startsAt, endsAt;

      if (formValues.allDay) {
        // For all-day events, use YYYY-MM-DD format
        startsAt = formValues.startDateTime.toISOString().split("T")[0];
        // For all-day events, the end date must be the same as the start date
        endsAt = startsAt;
      } else {
        // For regular events, use ISO format
        startsAt = formValues.startDateTime.toISOString();
        endsAt = formValues.endDateTime.toISOString();
      }

      const response = await scheduleMeeting(
        formValues.accountId,
        parseInt(formValues.projectId),
        parseInt(formValues.scheduleId),
        {
          summary: formValues.summary,
          description: formValues.description,
          starts_at: startsAt,
          ends_at: endsAt,
          all_day: formValues.allDay,
          participant_ids: formValues.participantIds.map((id) => parseInt(id, 10)),
          notify: formValues.notifyParticipants,
        },
      );

      // Determine the success message based on whether the URL was copied
      const successMessage =
        preferences.copyMeetingUrl && response.app_url
          ? "✅ Meeting scheduled successfully and URL copied to clipboard"
          : "✅ Meeting scheduled successfully";

      // Copy URL if preference is enabled
      if (preferences.copyMeetingUrl && response.app_url) {
        await Clipboard.copy(response.app_url);
      }

      // Show success message
      showHUD(successMessage, {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    } catch (error) {
      showFailureToast(error, {
        title: "Failed to schedule meeting",
      });
    }
  }, [formValues]);

  // Use cached promise for accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useCachedPromise(fetchAccounts);

  // Use cached promise for projects
  const { data: projectsResponse, isLoading: isLoadingProjects } = useCachedPromise(
    async (accountId: string) => {
      if (!accountId) return { data: [] };
      return fetchProjects(accountId, 1);
    },
    [formValues.accountId || ""],
    {
      execute: !!formValues.accountId,
    },
  );

  // Extract projects array from the response
  const projects: BasecampProject[] = projectsResponse?.data || [];

  // Set saved project when projects are loaded
  useEffect(() => {
    if (projects.length > 0 && savedProjectId) {
      const projectExists = projects.some((project) => project.id.toString() === savedProjectId);
      if (projectExists) {
        setFormValues((prev) => {
          // Only update if it's different to avoid infinite loops
          if (prev.projectId !== savedProjectId) {
            return { ...prev, projectId: savedProjectId };
          }
          return prev;
        });
      } else {
        // If saved project doesn't exist in the list, clear it
        setSavedProjectId("");
      }
    } else if (projects.length === 1) {
      const projectId = projects[0].id.toString();
      setFormValues((prev) => {
        // Only update if it's different to avoid infinite loops
        if (prev.projectId !== projectId) {
          return { ...prev, projectId };
        }
        return prev;
      });
      if (savedProjectId !== projectId) {
        setSavedProjectId(projectId);
      }
    }
  }, [projects, savedProjectId]);

  // Use cached promise for project people
  const { data: projectPeopleData = [], isLoading: isLoadingProjectPeople } = useCachedPromise(
    async (accountId: string, projectId: string) => {
      if (!accountId || !projectId) return [];
      return getProjectPeople(accountId, parseInt(projectId));
    },
    [formValues.accountId || "", formValues.projectId || ""],
    {
      execute: !!formValues.accountId && !!formValues.projectId,
    },
  );

  // Use cached promise for schedules
  const { data: schedulesData = [], isLoading: isLoadingSchedules } = useCachedPromise(
    async (accountId: string, projectId: string) => {
      if (!accountId || !projectId) return [];
      return fetchSchedules(accountId, parseInt(projectId));
    },
    [formValues.accountId || "", formValues.projectId || ""],
    {
      execute: !!formValues.accountId && !!formValues.projectId,
    },
  );

  // Update project people and schedules when data is loaded
  useEffect(() => {
    setProjectPeople(projectPeopleData);
    setSchedules(schedulesData as Schedule[]);

    if (savedScheduleId && schedulesData.some((schedule) => schedule.id.toString() === savedScheduleId)) {
      setFormValues((prev) => ({ ...prev, scheduleId: savedScheduleId }));
    } else if (schedulesData.length === 1) {
      const scheduleId = schedulesData[0].id.toString();
      setFormValues((prev) => ({ ...prev, scheduleId }));
      setSavedScheduleId(scheduleId);
    } else {
      setFormValues((prev) => ({ ...prev, scheduleId: "" }));
      setSavedScheduleId("");
    }
  }, [projectPeopleData, schedulesData, savedScheduleId]);

  // Set saved values after data is loaded
  useEffect(() => {
    if (accounts.length > 0 && savedAccountId) {
      const accountExists = accounts.some((account) => account.id.toString() === savedAccountId);
      if (accountExists) {
        setFormValues((prev) => ({ ...prev, accountId: savedAccountId }));
      }
    } else if (accounts.length === 1) {
      const accountId = accounts[0].id.toString();
      setFormValues((prev) => ({ ...prev, accountId }));
      setSavedAccountId(accountId);
    }
  }, [accounts, savedAccountId]);

  // Update end time when start time changes to maintain duration
  useEffect(() => {
    if (formValues.startDateTime && formValues.endDateTime) {
      if (formValues.allDay) {
        // For all-day events, ensure end date is the same as start date
        setFormValues((prev) => ({
          ...prev,
          endDateTime: new Date(prev.startDateTime),
        }));
      } else {
        const currentDuration = formValues.endDateTime.getTime() - formValues.startDateTime.getTime();
        if (currentDuration < 0 && formValues.startDateTime) {
          setFormValues((prev) => ({
            ...prev,
            endDateTime: addHours(formValues.startDateTime, 1),
          }));
        }
      }
    }
  }, [formValues.startDateTime, formValues.allDay]);

  // Ensure end date matches start date when allDay is toggled
  useEffect(() => {
    if (formValues.allDay && formValues.startDateTime) {
      setFormValues((prev) => ({
        ...prev,
        endDateTime: new Date(prev.startDateTime),
      }));
    }
  }, [formValues.allDay]);

  const isLoading = isLoadingAccounts || isLoadingProjects || isLoadingProjectPeople || isLoadingSchedules;

  // Focus on summary field once the form is fully loaded
  useEffect(() => {
    const hasRequiredFields =
      formValues.accountId && formValues.projectId && formValues.scheduleId && schedules.length > 0;
    if (!isLoading && hasRequiredFields) {
      isInitializedRef.current = true;
      setTimeout(() => {
        summaryFieldRef.current?.focus();
      }, 300);
    }
  }, [isLoading, formValues.accountId, formValues.projectId, formValues.scheduleId, schedules.length]);

  // Reset initialization state when account changes
  useEffect(() => {
    isInitializedRef.current = false;
    return () => {
      isInitializedRef.current = false;
    };
  }, [formValues.accountId]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Schedule Meeting" onAction={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Dropdown
        id="accountId"
        title="Account"
        value={formValues.accountId}
        onChange={(newValue: string) => {
          if (newValue !== formValues.accountId) {
            setFormValues((prev) => ({
              ...prev,
              accountId: newValue,
              projectId: "",
              scheduleId: "",
            }));
            setSavedProjectId("");
            setSavedScheduleId("");
            setSavedAccountId(newValue);
          }
        }}
        error={formErrors.accountId}
        autoFocus={false}
      >
        {accounts.map((account) => (
          <Form.Dropdown.Item key={account.id} value={account.id.toString()} title={account.name} />
        ))}
      </Form.Dropdown>

      {formValues.accountId && (
        <Form.Dropdown
          id="projectId"
          title="Project"
          value={formValues.projectId}
          onChange={(newValue: string) => {
            setFormValues((prev) => ({
              ...prev,
              projectId: newValue,
              scheduleId: "",
            }));
            setSavedScheduleId("");
            setSavedProjectId(newValue);
          }}
          error={formErrors.projectId}
          autoFocus={false}
        >
          {projects.map((project: BasecampProject) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id.toString()}
              title={project.name}
              icon={project.bookmarked ? { source: Icon.Star, tintColor: "yellow" } : undefined}
            />
          ))}
        </Form.Dropdown>
      )}

      {formValues.accountId && formValues.projectId && (
        <>
          {schedules.length > 0 ? (
            <Form.Dropdown
              id="scheduleId"
              title="Schedule"
              value={formValues.scheduleId}
              onChange={(newValue: string) => {
                if (newValue !== formValues.scheduleId) {
                  setFormValues((prev) => ({
                    ...prev,
                    scheduleId: newValue,
                  }));
                  setSavedScheduleId(newValue);
                }
              }}
              error={formErrors.scheduleId}
            >
              {schedules.map((schedule) => (
                <Form.Dropdown.Item
                  key={schedule.id}
                  value={schedule.id.toString()}
                  title={schedule.title}
                  icon={{ source: Icon.Calendar }}
                />
              ))}
            </Form.Dropdown>
          ) : (
            <Form.Description
              title="No Schedule Available"
              text="This project doesn't have a schedule tool enabled. Please select a different project."
            />
          )}

          {schedules.length > 0 && (
            <>
              <Form.TextField
                id="summary"
                title="Meeting Title"
                placeholder="Enter meeting title..."
                value={formValues.summary}
                onChange={(newValue: string) => setFormValues((prev) => ({ ...prev, summary: newValue }))}
                error={formErrors.summary}
                ref={summaryFieldRef}
              />

              <Form.Checkbox
                id="allDay"
                label="All Day Event"
                value={formValues.allDay}
                onChange={(checked) => {
                  const startDate = new Date();
                  startDate.setHours(0, 0, 0, 0);
                  const nextDay = new Date(startDate);
                  nextDay.setDate(nextDay.getDate() + 1);

                  if (checked) {
                    setFormValues((prev) => ({
                      ...prev,
                      allDay: true,
                      startDateTime: nextDay,
                      endDateTime: nextDay,
                    }));
                  } else {
                    const now = new Date();
                    const nextHour = new Date(now);
                    nextHour.setHours(nextHour.getHours() + 1);
                    nextHour.setMinutes(0, 0, 0);
                    const twoHoursLater = addHours(nextHour, 1);
                    setFormValues((prev) => ({
                      ...prev,
                      allDay: false,
                      startDateTime: nextHour,
                      endDateTime: twoHoursLater,
                    }));
                  }
                }}
              />

              {!formValues.allDay && (
                <>
                  <Form.DatePicker
                    id="startDateTime"
                    title="Start Date & Time"
                    type={Form.DatePicker.Type.DateTime}
                    value={formValues.startDateTime}
                    onChange={(newValue: Date | null) => {
                      if (newValue) {
                        setFormValues((prev) => ({ ...prev, startDateTime: newValue }));
                      }
                    }}
                    error={formErrors.startDateTime}
                  />
                  <Form.DatePicker
                    id="endDateTime"
                    title="End Date & Time"
                    type={Form.DatePicker.Type.DateTime}
                    value={formValues.endDateTime}
                    onChange={(newValue: Date | null) => {
                      if (newValue) {
                        setFormValues((prev) => ({ ...prev, endDateTime: newValue }));
                      }
                    }}
                    error={formErrors.endDateTime}
                  />
                </>
              )}

              {formValues.allDay && (
                <Form.DatePicker
                  id="startDateTime"
                  title="Date"
                  type={Form.DatePicker.Type.Date}
                  value={formValues.startDateTime}
                  onChange={(newValue: Date | null) => {
                    if (newValue) {
                      const nextDay = new Date(newValue);
                      nextDay.setDate(nextDay.getDate() + 1);
                      setFormValues((prev) => ({
                        ...prev,
                        startDateTime: newValue,
                        endDateTime: nextDay,
                      }));
                    }
                  }}
                />
              )}

              <Form.TagPicker
                id="participantIds"
                title="Participants"
                value={formValues.participantIds}
                onChange={(newValue: string[]) => setFormValues((prev) => ({ ...prev, participantIds: newValue }))}
              >
                {projectPeople.map((person) => (
                  <Form.TagPicker.Item
                    key={person.id}
                    value={person.id.toString()}
                    title={person.name}
                    icon={{ source: person.avatar_url }}
                  />
                ))}
              </Form.TagPicker>

              {formValues.participantIds.length > 0 && (
                <Form.Checkbox
                  id="notifyParticipants"
                  label="Notify participants about this meeting"
                  value={formValues.notifyParticipants}
                  onChange={(checked: boolean) => setFormValues((prev) => ({ ...prev, notifyParticipants: checked }))}
                />
              )}

              <Form.TextArea
                id="description"
                title="Description"
                placeholder="Add meeting details..."
                enableMarkdown
                value={formValues.description}
                onChange={(newValue: string) => setFormValues((prev) => ({ ...prev, description: newValue }))}
              />
            </>
          )}
        </>
      )}
    </Form>
  );
}
