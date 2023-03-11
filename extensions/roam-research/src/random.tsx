import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useRandomNote } from "./cache";
import { UpdateAction } from "./components";
import { BlockDetail } from "./detail";
import { CONSTANTS, keys } from "./utils";

const RandomPage = ({ graph }: { graph: CachedGraph }) => {
  const block = useRandomNote(graph.nameField);
  if (block) {
    return <BlockDetail block={block} graph={graph} />;
  }
  return null;
};

export default function Random() {
  const [graphCache] = useCachedState(
    CONSTANTS.keys.graph,
    {} as Record<string, { tokenField: string; nameField: string }>
  );
  return (
    <List>
      {keys(graphCache).map((key) => {
        return (
          <List.Item
            title={key}
            key={key}
            icon={Icon.Shuffle}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Shuffle} title="Random Block" target={<RandomPage graph={graphCache[key]} />} />
                <UpdateAction graph={graphCache[key]} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
