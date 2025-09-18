import { useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { MESSAGES } from "./constants/messages";
import { formatRawSql, copyAndExit } from "./utils";

export default function FormatSqlCommand() {
  const [sqlInput, setSqlInput] = useState<string>("");
  const [localFormattedSql, setLocalFormattedSql] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { sqlInput?: string; formattedSql?: string }) => {
    setIsLoading(true);
    try {
      if (localFormattedSql && values.formattedSql) {
        await copyAndExit(localFormattedSql);
        return;
      }

      const inputSql = values.sqlInput;
      if (!inputSql?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: MESSAGES.ERROR.EMPTY_INPUT,
        });
        return;
      }

      const formatted = formatRawSql(inputSql);

      if (formatted && formatted.trim()) {
        setLocalFormattedSql(formatted);
        await showToast({
          style: Toast.Style.Success,
          title: MESSAGES.SUCCESS.SQL_FORMATTED,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: MESSAGES.ERROR.GENERAL_ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={localFormattedSql ? MESSAGES.ACTIONS.COPY_TO_CLIPBOARD : MESSAGES.ACTIONS.FORMAT_SQL}
            onSubmit={handleSubmit}
          />
          {localFormattedSql && (
            <>
              <Action.CopyToClipboard
                title={MESSAGES.ACTIONS.COPY_TO_CLIPBOARD}
                content={localFormattedSql}
                onCopy={async () => {
                  await copyAndExit(localFormattedSql);
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      {!localFormattedSql ? (
        <Form.TextArea
          id="sqlInput"
          title={MESSAGES.TITLES.SQL_INPUT}
          placeholder={MESSAGES.PLACEHOLDERS.SQL_INPUT}
          value={sqlInput}
          onChange={setSqlInput}
        />
      ) : (
        <Form.TextArea
          id="formattedSql"
          title={MESSAGES.TITLES.FORMAT_RESULT}
          value={localFormattedSql}
          onChange={() => {}}
          enableMarkdown={true}
          placeholder=""
          storeValue={false}
        />
      )}
    </Form>
  );
}
