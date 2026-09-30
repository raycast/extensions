import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { DailyLog } from "../domain/dailyLog/DailyLog";
import { NewDailyLog } from "../domain/dailyLog/NewDailyLog";
import { createNewLogUseCaseFactory, editDailyLogUseCaseFactory } from "../factories/useCases";
import { formatRelativeDay } from "../shared/dates";
import { randomPlaceholder } from "../shared/randomPlaceholder";
import { showErrorToast } from "./errors";
import { refreshReminder } from "./refreshReminder";

interface LogFormValues {
  title: string;
  date: Date | null;
}

/**
 * Form to create a new log or edit an existing one.
 * The date field allows logging something you forgot to log earlier (even on a previous day).
 */
export function LogForm(props: { log?: DailyLog; defaultDate?: Date; onSaved?: (log: DailyLog) => void }) {
  const { pop } = useNavigation();
  const isEditing = props.log !== undefined;

  const { handleSubmit, itemProps } = useForm<LogFormValues>({
    initialValues: { title: props.log?.title ?? "", date: props.log?.date ?? props.defaultDate ?? new Date() },
    validation: { title: FormValidation.Required },
    onSubmit: async ({ title, date }) => {
      try {
        const logDate = date ?? new Date();
        let saved: DailyLog;
        if (props.log) {
          saved = new DailyLog(props.log.id, logDate, title.trim());
          editDailyLogUseCaseFactory().execute(props.log, saved);
        } else {
          saved = createNewLogUseCaseFactory().execute(new NewDailyLog(title, logDate));
        }
        await showToast(
          Toast.Style.Success,
          isEditing ? "Log edited" : `Logged for ${formatRelativeDay(logDate)}`,
          title,
        );
        await refreshReminder();
        if (props.onSaved) {
          props.onSaved(saved);
          pop();
        } else {
          await popToRoot({ clearSearchBar: true });
        }
      } catch (error) {
        await showErrorToast(isEditing ? "Could not edit the log" : "Could not save the log", error);
      }
    },
  });

  return (
    <Form
      navigationTitle={isEditing ? "Edit Log" : "New Log"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={isEditing ? Icon.Pencil : Icon.Plus}
            title={isEditing ? "Save Log" : "Add Log"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="What did you do?" placeholder={randomPlaceholder()} autoFocus {...itemProps.title} />
      <Form.DatePicker
        title="When"
        info="Change it to log something you forgot to log earlier"
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.date}
      />
    </Form>
  );
}
