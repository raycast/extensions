import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { search } from "./api/search";
import NodeList from "./node-list";

export default function SearchNode() {
  const { push } = useNavigation();

  async function handleSubmit(values: { alias: string }) {
    const nodes = await searchNode(values.alias);
    push(<NodeList nodes={nodes} />);
  }

  async function searchNode(alias: string) {
    const result = await search(alias);
    return result.search.node_results.results;
  }

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField id="alias" title="Alias" />
      </Form>
    </>
  );
}
