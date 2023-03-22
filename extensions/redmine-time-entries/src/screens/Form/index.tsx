import { useEffect, useState, useRef } from "react";
import {
  Form as RForm,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import axios from "axios";

import { ActivitySelect } from "@/src/components/ActivitySelect";

import { REQUIRED_FIELDS } from "@/src/constants";
import { getErrorMessaage } from "@/src/utils/getErrorMessage";

import type { Project, Values, Preferences } from "@/src/types";

export const Form = () => {
  const [preferences, setPreferences] = useState<Preferences | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const projectRef = useRef<RForm.Dropdown>(null);
  const dateRef = useRef<RForm.DatePicker>(null);
  const activityRef = useRef<RForm.Dropdown>(null);
  const hoursRef = useRef<RForm.TextField>(null);
  const commentRef = useRef<RForm.TextField>(null);

  useEffect(() => {
    const preferences = getPreferenceValues<Preferences>();

    setPreferences(preferences);
  }, []);

  const handleFetchProjects = async () => {
    if (!(preferences?.redmineApiKey && preferences?.redmineUrl)) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading",
      message: "Loading projects...",
    });

    try {
      const response = await axios.get(`${preferences?.redmineUrl}/projects.json`, {
        headers: {
          "X-Redmine-API-Key": preferences?.redmineApiKey,
        },
      });

      const projects = response.data.projects.filter(({ status }: { status: number }) => status === 1);

      setProjects(projects);

      toast.style = Toast.Style.Success;
      toast.title = "Done";
      toast.message = "Projects were successfully loaded";

      projectRef.current?.focus();
    } catch (error: unknown) {
      toast.style = Toast.Style.Failure;
      toast.message = getErrorMessaage(error);
      toast.title = "Error";
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preferences?.redmineApiKey && preferences?.redmineUrl && !projects.length) {
      handleFetchProjects();
    }
  }, [preferences, projects, handleFetchProjects]);

  const handleBlur = (e: RForm.Event<string[] | string | Date | null>) => {
    if (REQUIRED_FIELDS.includes(e.target.id) && !e.target.value) {
      setErrors((errors) => ({ ...errors, [e.target.id]: "This field is required" }));
    }
  };

  const handleChange = (id: string, value: string | Date | null | undefined) => {
    if (REQUIRED_FIELDS.includes(id) && value) {
      setErrors((errors) => ({ ...errors, [id]: undefined }));
    }
  };

  const handleValidate = (values: Values) => {
    Object.entries(values).forEach(([key, value]) => {
      if (REQUIRED_FIELDS.includes(key) && !value) {
        setErrors((errors) => ({ ...errors, [key]: "This field is required" }));

        return true;
      }
    });

    if (isNaN(Number(values.hours))) {
      setErrors((errors) => ({ ...errors, hours: "This field must be a number" }));

      return true;
    }

    if (!Object.values(errors).some((error) => error !== undefined)) {
      return true;
    }

    return false;
  };

  const handleResetForm = () => {
    dateRef.current?.reset();
    hoursRef.current?.reset();
    commentRef.current?.reset();

    setErrors({});

    dateRef.current?.focus();
  };

  const handleSubmit = async (values: Values) => {
    const isValid = handleValidate(values);

    if (!isValid) {
      return;
    }

    setLoading(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading",
      message: "Creating time entry...",
    });

    try {
      await axios.post(`${preferences?.redmineUrl}/time_entries.json`, null, {
        headers: {
          "X-Redmine-API-Key": preferences?.redmineApiKey,
        },
        params: {
          "time_entry[project_id]": values.project_id,
          "time_entry[spent_on]": values.spent_on?.toISOString().slice(0, 10),
          "time_entry[hours]": values.hours,
          "time_entry[comments]": values.comments,
          "time_entry[activity_id]": values.activity_id,
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Done";
      toast.message = "Time entry was successfully created";

      handleResetForm();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.message = getErrorMessaage(error);
      toast.title = "Error";
    } finally {
      setLoading(false);
    }
  };

  return (
    <RForm
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action title="Refresh Projects" onAction={handleFetchProjects} />
        </ActionPanel>
      }
    >
      <RForm.Dropdown
        ref={projectRef}
        id="project_id"
        title="Project"
        placeholder="Select project"
        error={errors.project_id}
        onBlur={handleBlur}
        onChange={(value) => handleChange("project_id", value)}
      >
        {projects.map((project) => (
          <RForm.Dropdown.Item key={project.id} value={String(project.id)} title={project.name} />
        ))}
      </RForm.Dropdown>
      <RForm.DatePicker
        ref={dateRef}
        id="spent_on"
        title="Date"
        error={errors.spent_on}
        type={RForm.DatePicker.Type.Date}
        onBlur={handleBlur}
        onChange={(date) => handleChange("spent_on", date)}
      />
      <ActivitySelect
        ref={activityRef}
        id="activity_id"
        title="Activity"
        error={errors.activity_id}
        onBlur={handleBlur}
        onChange={(value) => handleChange("activity_id", value)}
      />
      <RForm.TextField
        ref={hoursRef}
        id="hours"
        title="Hours"
        error={errors.hours}
        onBlur={handleBlur}
        onChange={(value) => handleChange("hours", value)}
      />
      <RForm.TextField ref={commentRef} id="comments" title="Comments" />
    </RForm>
  );
};
