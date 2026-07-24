import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { connectionFromPreferences, listConnections, type Connection } from "./lib/connections";
import { ResultView } from "./views/result-view";
import { NoConnection } from "./views/no-connection";

interface FormValues {
  connectionId: string;
  sql: string;
}

export default function RunQuery() {
  const { push } = useNavigation();
  const { data: connections, isLoading } = usePromise(async () => {
    const saved = await listConnections();
    if (saved.length > 0) return saved;
    const fallback = connectionFromPreferences();
    return fallback ? [fallback] : [];
  });

  if (!isLoading && (!connections || connections.length === 0)) {
    return <NoConnection />;
  }

  const defaultConnectionId = connections?.find((c) => c.isDefault)?.id ?? connections?.[0]?.id;

  function handleSubmit(values: FormValues) {
    const connection = connections?.find((c) => c.id === values.connectionId);
    if (!connection) return;
    const sql = values.sql.trim();
    if (!sql) return;
    push(<ResultView connection={connection} sql={sql} />);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Query" icon={Icon.Bolt} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="connectionId" title="Connection" defaultValue={defaultConnectionId} storeValue>
        {(connections ?? []).map((connection: Connection) => (
          <Form.Dropdown.Item key={connection.id} value={connection.id} title={connection.name} icon={Icon.HardDrive} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="sql" title="SQL" placeholder="SELECT * FROM users LIMIT 10" enableMarkdown={false} autoFocus />
    </Form>
  );
}
