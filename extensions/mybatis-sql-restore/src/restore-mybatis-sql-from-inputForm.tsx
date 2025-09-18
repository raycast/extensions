import { useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast, Detail } from "@raycast/api";
import { formatSql, parseMybatisLog, copyAndExit } from "./utils";
import { MESSAGES } from "./constants/messages";

export default function RestoreMybatisSqlFromInputForm() {
  const [sqlLog, setSqlLog] = useState<string>("");
  const [formattedSql, setFormattedSql] = useState<string>("");
  const [showDetail, setShowDetail] = useState<boolean>(false);

  const handleSubmit = async (values: { sqlLog?: string; formattedSql?: string }) => {
    try {
      if (formattedSql && values.formattedSql) {
        await copyAndExit(formattedSql);
        return;
      }

      const inputSql = values.sqlLog;
      if (!inputSql) {
        await showToast({
          style: Toast.Style.Failure,
          title: MESSAGES.ERROR.NO_VALID_SQL,
        });
        return;
      }

      const { sql, params } = parseMybatisLog(inputSql);

      if (!sql) {
        await showToast({
          style: Toast.Style.Failure,
          title: MESSAGES.ERROR.NO_VALID_SQL,
        });
        return;
      }

      const formatted = formatSql(sql, params);
      setFormattedSql(formatted);

      await showToast({
        style: Toast.Style.Success,
        title: MESSAGES.SUCCESS.SQL_FORMATTED,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: MESSAGES.ERROR.GENERAL_ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  if (showDetail && formattedSql) {
    return (
      <Detail
        markdown={`

\`\`\`sql
${formattedSql}
\`\`\`
`}
        actions={
          <ActionPanel>
            <Action
              title={MESSAGES.ACTIONS.COPY_FORMATTED}
              onAction={async () => {
                await copyAndExit(formattedSql);
              }}
            />
            <Action title={MESSAGES.ACTIONS.BACK} onAction={() => setShowDetail(false)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={formattedSql ? MESSAGES.ACTIONS.COPY_TO_CLIPBOARD : MESSAGES.ACTIONS.FORMAT_SQL}
            onSubmit={handleSubmit}
          />
          {formattedSql && (
            <>
              <Action title={MESSAGES.ACTIONS.VIEW_FORMATTED} onAction={() => setShowDetail(true)} />
              <Action
                title={MESSAGES.ACTIONS.COPY_FORMATTED}
                onAction={async () => {
                  await copyAndExit(formattedSql);
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      {!formattedSql ? (
        <Form.TextArea
          id="sqlLog"
          title={MESSAGES.TITLES.MYBATIS_SQL_LOG}
          placeholder={MESSAGES.PLACEHOLDERS.MYBATIS_LOG}
          value={sqlLog}
          onChange={setSqlLog}
        />
      ) : (
        <Form.TextArea
          id="formattedSql"
          title={MESSAGES.TITLES.FORMAT_RESULT}
          value={formattedSql}
          onChange={() => {}}
          enableMarkdown={true}
        />
      )}
    </Form>
  );
}
