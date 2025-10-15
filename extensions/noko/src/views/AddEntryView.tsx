import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useMemo, useCallback, useState, useEffect } from "react";
import { EntryFormData, ProjectType } from "../types";
import { useProjects, useTags, useTimer } from "../hooks/useApiData";
import { useEntrySubmission, useTimerActions } from "../hooks";
import {
  formatMinutesAsTime,
  convertElapsedTimeToMinutes,
  getElapsedTime,
} from "../utils";
import { TOAST_MESSAGES, TIME_DEFAULTS, FORM_MESSAGES } from "../constants";

type AddEntryViewProps = {
  onSubmit?: () => void;
  onCancel?: () => void;
  project: ProjectType | null;
};

export const AddEntryView = ({
  onSubmit,
  onCancel,
  project,
}: AddEntryViewProps) => {
  const { data: projects = [] } = useProjects();
  const { data: tags = [] } = useTags();
  const { data: timer, isLoading: timerLoading } = useTimer(
    project?.id || null,
  );
  const { submitEntry } = useEntrySubmission({
    onSuccess: onSubmit,
  });
  const { logTimer } = useTimerActions({
    onSuccess: onSubmit,
  });

  // Determine if we're logging a timer or creating a manual entry
  const isTimerMode = project !== null;

  const [minutesValue, setMinutesValue] = useState<string>(
    TIME_DEFAULTS.DEFAULT_TIME_FORMAT,
  );

  // Update minutes value when timer data is loaded
  useEffect(() => {
    if (isTimerMode && timer && !timerLoading) {
      const currentTime = new Date();
      const fetchTime = new Date();
      const elapsedTime = getElapsedTime(timer, currentTime, fetchTime);
      const minutes = convertElapsedTimeToMinutes(elapsedTime);
      setMinutesValue(formatMinutesAsTime(minutes));
    }
  }, [isTimerMode, timer, timerLoading]);

  const handleSubmit = useCallback(
    async (values: EntryFormData) => {
      try {
        if (isTimerMode) {
          await logTimer(project.id, values);
        } else {
          await submitEntry(values);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : TOAST_MESSAGES.ERROR.UNKNOWN_ERROR;

        showToast({
          style: Toast.Style.Failure,
          title: TOAST_MESSAGES.ERROR.INVALID_INPUT,
          message: errorMessage,
        });
      }
    },
    [isTimerMode, project, logTimer, submitEntry],
  );

  const projectOptions = useMemo(() => {
    return projects.map((project) => ({
      title: project.name,
      value: project.name,
    }));
  }, [projects]);

  const tagOptions = useMemo(() => {
    return tags.map((tag) => ({
      title: tag.formatted_name,
      value: tag.formatted_name,
    }));
  }, [tags]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          {onCancel && (
            <Action
              title="Back"
              icon={Icon.ArrowLeft}
              onAction={onCancel}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="project_name"
        title="Project"
        defaultValue={isTimerMode && project ? project.name : ""}
        storeValue={!isTimerMode}
        autoFocus={!isTimerMode}
        info={FORM_MESSAGES.PROJECT.INFO}
      >
        {projectOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            title={option.title}
            value={option.value}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="minutes"
        title="Time"
        placeholder={FORM_MESSAGES.TIME.PLACEHOLDER}
        value={minutesValue}
        onChange={setMinutesValue}
        info={FORM_MESSAGES.TIME.INFO}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder={FORM_MESSAGES.DESCRIPTION.PLACEHOLDER}
        autoFocus={isTimerMode}
        info={
          isTimerMode
            ? FORM_MESSAGES.DESCRIPTION.INFO_TIMER
            : FORM_MESSAGES.DESCRIPTION.INFO_MANUAL
        }
      />

      <Form.TagPicker
        id="tags"
        title="Tags"
        defaultValue={[]}
        info={FORM_MESSAGES.TAGS.INFO}
      >
        {tagOptions.map((tag) => (
          <Form.TagPicker.Item
            key={tag.value}
            title={tag.title}
            value={tag.value}
          />
        ))}
      </Form.TagPicker>

      <Form.DatePicker
        id="date"
        title="Date"
        defaultValue={new Date()}
        info={FORM_MESSAGES.DATE.INFO}
      />
    </Form>
  );
};
