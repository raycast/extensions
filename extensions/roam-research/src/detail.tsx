import { ActionPanel, Detail, Action, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useGraphAllBlocks } from "./cache";
import { AllBlocks, DailyNoteDetail } from "./components";
import { graphApiInitial } from "./roamApi";
import { ReversePullBlock } from "./type";
import { detailMarkdown, timeformatFromMs } from "./utils";

export function MentioningNotes({ block, graph }: { block: ReversePullBlock; graph: CachedGraph }) {
  const { isLoading, data } = usePromise(
    graphApiInitial(graph.nameField, graph.tokenField).getMentioning.bind(null, block[":block/uid"]!)
  );
  console.log(data, " ---");
  return (
    <AllBlocks
      blocks={data?.result || []}
      key={isLoading + ""}
      showAllFirst={true}
      graph={graph}
      isLoading={isLoading}
    />
  );
}

export function BlockDetail({ block, graph }: { block: ReversePullBlock; graph: CachedGraph }) {
  console.log(block[":block/_refs"], block, "---");
  const _refs = block[":block/_refs"] || [];
  return (
    <Detail
      navigationTitle={"Note Detail "}
      markdown={detailMarkdown(block)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://roamresearch.com/#/app/${graph.nameField}/page/${block[":block/uid"]}`} />
          {/* <Action.OpenWith title="Open in App" path={`roam://#/app/thoughtfull/page/${block[":block/uid"]}`} /> */}
          {_refs.length ? (
            <Action.Push
              title={`Show Linked References(${block[":block/_refs"].length})`}
              target={<MentioningNotes block={block} graph={graph} />}
            />
          ) : null}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Type">
            {block[":node/title"] ? (
              <Detail.Metadata.TagList.Item text="Page" color={"#eed535"} />
            ) : (
              <Detail.Metadata.TagList.Item text="Block" color={"#7AE1D8"} />
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Linked References" text={_refs.length + ""} />
          <Detail.Metadata.Label title="edit time" text={`${timeformatFromMs(block[":edit/time"])}`} />
          <Detail.Metadata.Label title="create time" text={`${timeformatFromMs(block[":create/time"])}`} />
        </Detail.Metadata>
      }
    />
  );
}

export const GraphDetail = ({ graph }: { graph: CachedGraph }) => {
  const { data } = useGraphAllBlocks(graph.nameField);
  const { push } = useNavigation();
  return (
    <List>
      <List.Item
        title="Search"
        actions={
          <ActionPanel>
            <Action
              title="Search"
              onAction={() => {
                push(<AllBlocks blocks={data} graph={graph} />);
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Append To Daily Note"
        actions={
          <ActionPanel>
            <Action.Push title="Append" target={<DailyNoteDetail graph={graph} />} />
          </ActionPanel>
        }
      />
    </List>
  );
};
