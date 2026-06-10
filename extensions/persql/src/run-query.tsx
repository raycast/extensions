import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getMe, listDatabases, resultMarkdown, runQuery } from "./api";

export default function RunQuery() {
  const { push } = useNavigation();
  const [isRunning, setIsRunning] = useState(false);
  const { data, isLoading } = useCachedPromise(
    async () => {
      const [me, databases] = await Promise.all([getMe(), listDatabases()]);
      return { me, databases };
    },
    [],
    {
      onError: async (e) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load databases",
          message: e.message,
        });
      },
    },
  );

  async function submit(values: { database: string; sql: string }) {
    if (!data || !values.sql.trim()) return;
    setIsRunning(true);
    try {
      const result = await runQuery(
        data.me.namespaceSlug,
        values.database,
        values.sql,
      );
      push(
        <Detail
          markdown={resultMarkdown(result)}
          navigationTitle={`${result.rows.length} rows`}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label
                title="Rows read"
                text={String(result.rowsRead)}
              />
              <Detail.Metadata.Label
                title="Rows written"
                text={String(result.rowsWritten)}
              />
            </Detail.Metadata>
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy as Markdown"
                content={resultMarkdown(result)}
              />
              <Action.CopyToClipboard
                title="Copy as JSON"
                content={JSON.stringify(result.rows, null, 2)}
              />
            </ActionPanel>
          }
        />,
      );
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Query failed",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isRunning}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Play}
            title="Run Query"
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="database" title="Database">
        {data?.databases.map((db) => (
          <Form.Dropdown.Item
            key={db.id}
            value={db.slug}
            title={`${db.name} (${db.slug})`}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="sql"
        title="SQL"
        placeholder="SELECT name FROM sqlite_master WHERE type = 'table'"
        enableMarkdown={false}
      />
    </Form>
  );
}
