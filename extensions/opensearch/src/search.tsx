import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { catIndices, getMapping } from "./lib/client";
import { connectionFromPreferences, listConnections, type Connection } from "./lib/connections";
import { flattenMapping } from "./lib/mapping";
import { ResultView } from "./views/result-view";
import { NoConnection } from "./views/no-connection";

export default function Search() {
  const { push } = useNavigation();
  const [connectionId, setConnectionId] = useState<string>();

  const { data: connections, isLoading: loadingConnections } = usePromise(async () => {
    const saved = await listConnections();
    if (saved.length > 0) return saved;
    const fallback = connectionFromPreferences();
    return fallback ? [fallback] : [];
  });

  const connection =
    connections?.find((c) => c.id === connectionId) ?? connections?.find((c) => c.isDefault) ?? connections?.[0];

  const { data: indices, isLoading: loadingIndices } = usePromise(
    async (conn?: Connection) => (conn ? catIndices(conn) : []),
    [connection],
  );

  if (!loadingConnections && (!connections || connections.length === 0)) {
    return <NoConnection />;
  }

  return (
    <List
      isLoading={loadingConnections || loadingIndices}
      searchBarPlaceholder="Filter indices…"
      searchBarAccessory={
        <List.Dropdown tooltip="Connection" value={connection?.id} onChange={setConnectionId}>
          {(connections ?? []).map((c) => (
            <List.Dropdown.Item key={c.id} value={c.id} title={c.name} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No indices" description="This connection has no indices, or it is unreachable." />
      {(indices ?? []).map((index) => (
        <List.Item
          key={index}
          icon={Icon.Layers}
          title={index}
          actions={
            <ActionPanel>
              {connection && (
                <>
                  <Action
                    title="Search Index"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => push(<SearchForm connection={connection} index={index} />)}
                  />
                  <Action
                    title="View Mapping"
                    icon={Icon.Tree}
                    onAction={() =>
                      push(<ResultView connection={connection} method="GET" path={`/${index}/_mapping`} />)
                    }
                  />
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface SearchFormProps {
  connection: Connection;
  index: string;
}

interface SearchFormValues {
  query: string;
  size: string;
}

function SearchForm({ connection, index }: SearchFormProps) {
  const { push } = useNavigation();

  // Field list from the mapping to help build a query (P3: turn these into insertable clauses).
  const { data: fields } = usePromise(async () => flattenMapping(await getMapping(connection, index)), []);
  const fieldHint = (fields ?? [])
    .slice(0, 30)
    .map((f) => `${f.field} (${f.type})`)
    .join(", ");

  function handleSubmit(values: SearchFormValues) {
    let query: unknown;
    try {
      query = JSON.parse(values.query || "{}");
    } catch {
      showFailureToast(new Error("Query DSL is not valid JSON"), { title: "Invalid query" });
      return;
    }
    const size = Number.parseInt(values.size, 10);
    const body = JSON.stringify({ query, size: Number.isFinite(size) ? size : 10 });
    push(<ResultView connection={connection} method="POST" path={`/${index}/_search`} body={body} />);
  }

  return (
    <Form
      navigationTitle={`Search ${index}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Search" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title="Query DSL"
        defaultValue={`{ "match_all": {} }`}
        info="The value of the top-level `query` object."
        enableMarkdown={false}
      />
      <Form.TextField id="size" title="Size" defaultValue="10" />
      {fieldHint.length > 0 && <Form.Description title="Fields" text={fieldHint} />}
    </Form>
  );
}
