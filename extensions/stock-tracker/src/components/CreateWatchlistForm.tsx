import { Form, ActionPanel, Action } from "@raycast/api";
import { useI18n } from "../locales";
import { StockItem, CreateWatchlistMode, FormValues } from "../types";
import { useCreateWatchlistForm } from "../hooks/useCreateWatchlistForm";
import { FORM_FIELD_IDS } from "../constants";

export interface CreateWatchlistFormProps {
  onSuccess?: () => void;
  stockToAdd?: StockItem;
  mode?: CreateWatchlistMode;
}

export type CreateWatchlistFormValues = FormValues;

export function CreateWatchlistForm({ onSuccess, stockToAdd, mode = "create" }: CreateWatchlistFormProps) {
  const { t } = useI18n();
  const { handleSubmit, submitTitle } = useCreateWatchlistForm({
    onSuccess,
    stockToAdd,
    mode,
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
        autoFocus
      />
    </Form>
  );
}
