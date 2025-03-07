import { Action, ActionPanel, Form, Toast, Icon, showHUD, PopToRootType } from "@raycast/api";
import { FormValidation, useForm, useCachedPromise, useLocalStorage, showFailureToast } from "@raycast/utils";
import { scheduleMeeting, getProjectPeople, fetchSchedules, fetchAccounts, fetchProjects } from "../oauth/auth";
import { showToast } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { BasecampPerson, BasecampProject } from "../utils/types";
import { addHours } from "date-fns";

interface Schedule {
  id: number;
  title: string;
  url: string;
  app_url: string;
}

interface ScheduleMeetingFormValues {
  accountId: string;
  projectId: string;
  summary: string;
  description: string;
  startDateTime: Date | null;
  endDateTime: Date | null;
  allDay: boolean;
  scheduleId: string;
  participantIds: string[];
  notifyParticipants: boolean;
}

export default function ScheduleMeetingForm() {
  const [projectPeople, setProjectPeople] = useState<BasecampPerson[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const summaryFieldRef = useRef<Form.TextField>(null);

  // Add a ref to track initialization state
  const isInitializedRef = useRef<boolean>(false);

  const [isLoadingProjectPeople, setIsLoadingProjectPeople] = useState(false);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  // Add localStorage hooks for persistent values
  const { value: savedAccountId, setValue: setSavedAccountId } = useLocalStorage<string>(
    "basecamp-account-id-schedule",
    "",
  );
  const { value: savedProjectId, setValue: _setSavedProjectId } = useLocalStorage<string>(
    "basecamp-project-id-schedule",
    "",
  );
  const { value: savedScheduleId, setValue: setSavedScheduleId } = useLocalStorage<string>(
    "basecamp-schedule-id-schedule",
    "",
  );

  // Create a tracking function for savedProjectId changes
  const setSavedProjectId = (newValue: string) => {
    _setSavedProjectId(newValue);
  };

  // Set default start time to now and end time to 1 hour from now
  const now = new Date();
  const oneHourLater = addHours(now, 1);

  // Initialize form with saved values
  const { handleSubmit, itemProps, values, setValue } = useForm<ScheduleMeetingFormValues>({
    async onSubmit(values) {
      if (!values.accountId || !values.projectId || !values.scheduleId) {
        showToast({
          style: Toast.Style.Failure,
          title: "Missing Required Fields",
          message: "Please select an account, project, and schedule",
        });
        return;
      }

      if (!values.startDateTime || !values.endDateTime) {
        showToast({
          style: Toast.Style.Failure,
          title: "Missing Date/Time",
          message: "Please select start and end times for the meeting",
        });
        return;
      }

      // Check if summary is empty and focus on it
      if (!values.summary.trim()) {
        showToast({
          style: Toast.Style.Failure,
          title: "Missing Title",
          message: "Please enter a title for the meeting",
        });
        summaryFieldRef.current?.focus();
        return;
      }

      try {
        await scheduleMeeting(values.accountId, parseInt(values.projectId), parseInt(values.scheduleId), {
          summary: values.summary,
          description: values.description,
          starts_at: values.startDateTime.toISOString(),
          ends_at: values.endDateTime.toISOString(),
          all_day: values.allDay,
          participant_ids: values.participantIds.map((id) => parseInt(id, 10)),
          notify: values.notifyParticipants,
        });

        showHUD("✅ Meeting scheduled successfully", {
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        showFailureToast(error, {
          title: "Failed to schedule meeting",
        });
      }
    },
    initialValues: {
      accountId: "",
      projectId: "",
      startDateTime: now,
      endDateTime: oneHourLater,
      allDay: false,
      participantIds: [],
      notifyParticipants: true,
      scheduleId: "",
      summary: "",
      description: "",
    },
    validation: {
      accountId: FormValidation.Required,
      projectId: FormValidation.Required,
      summary: FormValidation.Required,
      scheduleId: FormValidation.Required,
    },
  });

  // Use cached promise for accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useCachedPromise(fetchAccounts);

  // Use cached promise for projects
  const { data: projectsResponse, isLoading: isLoadingProjects } = useCachedPromise(
    async (accountId: string) => {
      if (!accountId) return { data: [] };
      return fetchProjects(accountId, 1);
    },
    [values.accountId || ""],
    {
      execute: !!values.accountId,
    },
  );

  // Extract projects array from the response
  const projects: BasecampProject[] = projectsResponse?.data || [];

  // Set saved values after data is loaded
  useEffect(() => {
    if (accounts.length > 0 && savedAccountId) {
      // Check if the saved account ID exists in the accounts list
      const accountExists = accounts.some((account) => account.id.toString() === savedAccountId);
      if (accountExists) {
        setValue("accountId", savedAccountId);
      }
    } else if (accounts.length === 1) {
      // Auto-select the only account if there's just one
      setValue("accountId", accounts[0].id.toString());
      setSavedAccountId(accounts[0].id.toString());
    }
  }, [accounts, savedAccountId]);

  // Set saved project when projects are loaded
  useEffect(() => {
    if (projects.length > 0 && savedProjectId) {
      // Check if the saved project ID exists in the projects list
      const projectExists = projects.some((project) => project.id.toString() === savedProjectId);
      if (projectExists) {
        // Only set the form value, don't update the saved value
        setValue("projectId", savedProjectId);
      }
    } else if (projects.length === 1) {
      // Auto-select the only project if there's just one

      // Check if we need to update both the form value and saved value
      const projectId = projects[0].id.toString();
      setValue("projectId", projectId);

      // Only update the saved value if it's different
      if (savedProjectId !== projectId) {
        setSavedProjectId(projectId);
      }
    }
  }, [projects, savedProjectId]);

  // Fetch project data (people and schedules) when project is selected
  useEffect(() => {
    const loadProjectData = async () => {
      if (!values.accountId || !values.projectId) {
        // Clear schedules and project people when account or project is not selected
        setSchedules([]);
        setProjectPeople([]);
        return;
      }

      setIsLoadingProjectPeople(true);
      setIsLoadingSchedules(true);
      try {
        const [fetchedProjectPeople, fetchedSchedules] = await Promise.all([
          getProjectPeople(values.accountId, parseInt(values.projectId)),
          fetchSchedules(values.accountId, parseInt(values.projectId)),
        ]);
        setProjectPeople(fetchedProjectPeople);
        setSchedules(fetchedSchedules as Schedule[]);

        // If there's a saved schedule ID and it exists in the fetched schedules, select it
        if (savedScheduleId && fetchedSchedules.some((schedule) => schedule.id.toString() === savedScheduleId)) {
          setValue("scheduleId", savedScheduleId);
        } else if (fetchedSchedules.length === 1) {
          // If there's only one schedule, select it by default
          setValue("scheduleId", fetchedSchedules[0].id.toString());
          setSavedScheduleId(fetchedSchedules[0].id.toString());
        } else {
          // Clear the schedule ID if there's no matching saved schedule
          setValue("scheduleId", "");
          setSavedScheduleId("");
        }
      } catch (error) {
        console.error("Error fetching project data:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Project Data",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      } finally {
        setIsLoadingProjectPeople(false);
        setIsLoadingSchedules(false);
      }
    };

    loadProjectData();
  }, [values.accountId, values.projectId, savedScheduleId]);

  // Update end time when start time changes to maintain duration
  useEffect(() => {
    if (values.startDateTime && values.endDateTime) {
      const currentDuration = values.endDateTime.getTime() - values.startDateTime.getTime();
      if (currentDuration < 0) {
        // If start time is after end time, set end time to 1 hour after start
        setValue("endDateTime", addHours(values.startDateTime, 1));
      }
    }
  }, [values.startDateTime]);

  const isLoading = isLoadingAccounts || isLoadingProjects || isLoadingProjectPeople || isLoadingSchedules;

  // Focus on summary field once the form is fully loaded
  useEffect(() => {
    const hasRequiredFields = values.accountId && values.projectId && values.scheduleId && schedules.length > 0;
    if (!isLoading && hasRequiredFields) {
      // Focus on the meeting title field when the form is fully loaded

      // Mark the component as fully initialized
      isInitializedRef.current = true;

      setTimeout(() => {
        summaryFieldRef.current?.focus();
      }, 300); // 300ms delay to ensure the component is fully rendered
    }
  }, [isLoading, values.accountId, values.projectId, values.scheduleId, schedules.length]);

  // Reset initialization state when account changes
  useEffect(() => {
    // Reset initialization state when account changes
    isInitializedRef.current = false;

    // Cleanup function to reset initialization state when component unmounts
    return () => {
      isInitializedRef.current = false;
    };
  }, [values.accountId]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Schedule Meeting" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Dropdown
        id={itemProps.accountId.id}
        title="Account"
        value={values.accountId}
        onChange={(newValue: string) => {
          // When account changes, reset project and schedule
          if (newValue !== values.accountId) {
            setValue("projectId", "");
            setValue("scheduleId", "");
            setSavedProjectId("");
            setSavedScheduleId("");
            setSavedAccountId(newValue);
          }
          if (itemProps.accountId.onChange) {
            itemProps.accountId.onChange(newValue);
          }
        }}
        error={itemProps.accountId.error}
        info={itemProps.accountId.info}
        onBlur={itemProps.accountId.onBlur}
        autoFocus={false}
      >
        {accounts.map((account) => (
          <Form.Dropdown.Item key={account.id} value={account.id.toString()} title={account.name} />
        ))}
      </Form.Dropdown>

      {values.accountId && (
        <Form.Dropdown
          id={itemProps.projectId.id}
          title="Project"
          value={values.projectId}
          onChange={(newValue: string) => {
            // When project changes, reset schedule
            setValue("scheduleId", "");
            setSavedScheduleId("");

            // Only update savedProjectId if this is a user-initiated change
            // We can detect this by checking if the component has already been fully initialized
            const isUserChange = isInitializedRef.current && newValue !== savedProjectId;

            if (isUserChange) {
              setSavedProjectId(newValue);
            }
            if (itemProps.projectId.onChange) {
              itemProps.projectId.onChange(newValue);
            }
          }}
          error={itemProps.projectId.error}
          info={itemProps.projectId.info}
          onBlur={itemProps.projectId.onBlur}
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

      {values.accountId && values.projectId && (
        <>
          {schedules.length > 0 ? (
            <Form.Dropdown
              id={itemProps.scheduleId.id}
              title="Schedule"
              value={values.scheduleId}
              onChange={(newValue: string) => {
                if (newValue !== values.scheduleId) {
                  setSavedScheduleId(newValue);
                }
                if (itemProps.scheduleId.onChange) {
                  itemProps.scheduleId.onChange(newValue);
                }
              }}
              error={itemProps.scheduleId.error}
              info={itemProps.scheduleId.info}
              onBlur={itemProps.scheduleId.onBlur}
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

          {/* Only show the rest of the form if schedules are available */}
          {schedules.length > 0 && (
            <>
              <Form.TextField
                id={itemProps.summary.id}
                title="Meeting Title"
                placeholder="Enter meeting title..."
                value={values.summary}
                onChange={itemProps.summary.onChange}
                error={itemProps.summary.error}
                info={itemProps.summary.info}
                onBlur={itemProps.summary.onBlur}
                ref={summaryFieldRef}
              />

              <Form.Checkbox
                id={itemProps.allDay.id}
                label="All Day Event"
                value={values.allDay}
                onChange={itemProps.allDay.onChange}
              />

              {!values.allDay && (
                <>
                  <Form.DatePicker
                    id={itemProps.startDateTime.id}
                    title="Start Date & Time"
                    type={Form.DatePicker.Type.DateTime}
                    value={values.startDateTime}
                    onChange={itemProps.startDateTime.onChange}
                  />
                  <Form.DatePicker
                    id={itemProps.endDateTime.id}
                    title="End Date & Time"
                    type={Form.DatePicker.Type.DateTime}
                    value={values.endDateTime}
                    onChange={itemProps.endDateTime.onChange}
                  />
                </>
              )}

              {values.allDay && (
                <Form.DatePicker
                  id={itemProps.startDateTime.id}
                  title="Date"
                  type={Form.DatePicker.Type.Date}
                  value={values.startDateTime}
                  onChange={itemProps.startDateTime.onChange}
                />
              )}

              <Form.TagPicker
                id={itemProps.participantIds.id}
                title="Participants"
                value={values.participantIds}
                onChange={itemProps.participantIds.onChange}
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

              {values.participantIds.length > 0 && (
                <Form.Checkbox
                  id={itemProps.notifyParticipants.id}
                  label="Notify participants about this meeting"
                  value={values.notifyParticipants}
                  onChange={itemProps.notifyParticipants.onChange}
                />
              )}

              <Form.TextArea
                id={itemProps.description.id}
                title="Description"
                placeholder="Add meeting details..."
                enableMarkdown
                value={values.description}
                onChange={itemProps.description.onChange}
              />
            </>
          )}
        </>
      )}
    </Form>
  );
}
