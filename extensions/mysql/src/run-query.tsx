import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
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

  // Don't mount the real Form until connections have loaded — otherwise the Connection dropdown
  // mounts with no default and can stay empty after load. A bare loading Form keeps the UI stable.
  if (isLoading) {
    return <Form isLoading />;
  }

  if (!connections || connections.length === 0) {
    return <NoConnection />;
  }

  const defaultConnectionId = connections.find((c) => c.isDefault)?.id ?? connections[0]?.id;

  async function handleSubmit(values: FormValues) {
    const connection = connections?.find((c) => c.id === values.connectionId);
    if (!connection) {
      await showToast({ style: Toast.Style.Failure, title: "Select a connection" });
      return;
    }
    const sql = values.sql.trim();
    if (!sql) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a SQL statement" });
      return;
    }
    push(<ResultView connection={connection} sql={sql} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Query" icon={Icon.Bolt} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="connectionId" title="Connection" defaultValue={defaultConnectionId} storeValue>
        {connections.map((connection: Connection) => (
          <Form.Dropdown.Item key={connection.id} value={connection.id} title={connection.name} icon={Icon.HardDrive} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="sql" title="SQL" placeholder="SELECT * FROM users LIMIT 10" enableMarkdown={false} autoFocus />
    </Form>
  );
}
