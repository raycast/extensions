import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { connectionFromPreferences, listConnections, type Connection } from "./lib/connections";
import { parseConsole } from "./lib/console";
import { ResultView } from "./views/result-view";
import { NoConnection } from "./views/no-connection";

interface FormValues {
  connectionId: string;
  request: string;
}

const PLACEHOLDER = `GET posts/_search
{
  "query": { "match_all": {} }
}`;

export default function Console() {
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
    if (!connection) {
      showFailureToast(new Error("Selected connection no longer exists. Pick another one."), {
        title: "No connection",
      });
      return;
    }
    try {
      const { method, path, body } = parseConsole(values.request);
      push(<ResultView connection={connection} method={method} path={path} body={body} />);
    } catch (error) {
      showFailureToast(error, { title: "Could not parse request" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Request" icon={Icon.Bolt} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="connectionId" title="Connection" defaultValue={defaultConnectionId} storeValue>
        {(connections ?? []).map((connection: Connection) => (
          <Form.Dropdown.Item key={connection.id} value={connection.id} title={connection.name} icon={Icon.Plug} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="request"
        title="Request"
        placeholder={PLACEHOLDER}
        info="Dev Tools console syntax: first line is METHOD path, followed by an optional JSON body. The field grows as you add lines."
        enableMarkdown={false}
      />
    </Form>
  );
}
