import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { HTTP_METHODS, type HttpMethod } from "./lib/client";
import { connectionFromPreferences, listConnections, type Connection } from "./lib/connections";
import { ResultView } from "./views/result-view";
import { NoConnection } from "./views/no-connection";

interface FormValues {
  connectionId: string;
  method: string;
  path: string;
  body: string;
}

export default function ApiExplorer() {
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
    const path = values.path.trim();
    if (!path) return;
    push(
      <ResultView
        connection={connection}
        method={values.method as HttpMethod}
        path={path}
        body={values.body.trim() || undefined}
      />,
    );
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
      <Form.Dropdown id="method" title="Method" storeValue>
        {HTTP_METHODS.map((method) => (
          <Form.Dropdown.Item key={method} value={method} title={method} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="path" title="Path" placeholder="/_cluster/health" />
      <Form.TextArea
        id="body"
        title="Body"
        placeholder={`{\n  "query": { "match_all": {} }\n}`}
        enableMarkdown={false}
      />
    </Form>
  );
}
