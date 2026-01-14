import { Form, ActionPanel, Action } from "@raycast/api";
import { useI18n } from "../locales";
import { useRenameWatchlistForm } from "../hooks/useRenameWatchlistForm";
import { FormValues } from "../types";
import { FORM_FIELD_IDS } from "../constants";

export interface RenameWatchlistFormProps {
  watchlistId: string;
  currentName: string;
  onSuccess?: () => void;
}

export type RenameWatchlistFormValues = FormValues;

export function RenameWatchlistForm({ watchlistId, currentName, onSuccess }: RenameWatchlistFormProps) {
  const { t } = useI18n();
  const { handleSubmit, submitTitle } = useRenameWatchlistForm({
    watchlistId,
    currentName,
    onSuccess,
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} shortcut={{ modifiers: [], key: "enter" }} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={FORM_FIELD_IDS.NAME}
        title={t.watchlist.listNameTitle}
        placeholder={t.watchlist.listNamePlaceholder}
        defaultValue={currentName}
        autoFocus
      />
    </Form>
  );
}
