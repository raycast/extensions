import { Action, ActionPanel, Form, List, useNavigation } from "@raycast/api";
import { search } from "./api/search";

export default function LookupNode() {
  let timer: NodeJS.Timeout | null;

  const { push } = useNavigation();

  function handleSubmit(alias: string) {
    if (timer) clearTimeout(timer);

    timer = setTimeout(async () => {
      const nodes = await lookUpNode(alias);
      push(<NodesList nodes={nodes} />);
    }, 300);
  }

  async function lookUpNode(alias: string) {
    const result = await search(alias);
    return result.search.node_results.results;
  }

  return (
    <>
      <Form>
        <Form.TextField id="alias" title="Alias" onChange={handleSubmit} />
      </Form>
    </>
  );
}

export function NodesList(props: { nodes }) {
  return (
    <List>
      {props.nodes.map((node) => (
        <List.Item
          key={node.pubkey}
          title={node.alias}
          subtitle={`Channels: ${node.channel_amount}, Capacity: ${node.capacity / 100_000_000} `}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://amboss.space/node/${node.pubkey}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
