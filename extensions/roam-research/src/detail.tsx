import { ActionPanel, Detail, Action, List, useNavigation, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
// import { useGraphAllBlocks } from "./cache";
import { SingleGraphSearchView, QuickCaptureDetail, SelectedBlocksSearchView } from "./components";
import { initRoamBackendClient, getBackRefs, removeGraphPeerUrlFromCache } from "./roamApi";
import { detailMarkdown, timeformatFromMs, useGraphsConfig } from "./utils";
import { RandomBlockFromList } from "./random";

export function MentioningNotes({ block, graphConfig }: { block: ReversePullBlock; graphConfig: GraphConfig }) {
  const { isLoading, data } = usePromise(
    () => {
      return getBackRefs(initRoamBackendClient(graphConfig.nameField, graphConfig.tokenField), block[":block/uid"]);
    }
    // TODO: figure out why we were doing a bind here
    // graphApiInitial(graph.nameField, graph.tokenField).getMentioning.bind(null, block[":block/uid"]!)
  );
  // console.log("MentioningNotes", data, " ---");
  return (
    <SelectedBlocksSearchView
      blocks={data || []}
      key={isLoading + ""}
      showAllFirst={true}
      graphConfig={graphConfig}
      isLoading={isLoading}
    />
  );
}

export function BlockDetail({
  isLoadingBlock,
  block,
  graphConfig,
}: {
  isLoadingBlock?: boolean;
  block: ReversePullBlock | undefined;
  graphConfig: GraphConfig;
}) {
  const preferences = getPreferenceValues<Preferences>();
  // console.log(block?.[":block/_refs"], block, "---");
  const _refs = block?.[":block/_refs"] || [];
  return (
    <Detail
      navigationTitle={"Note Detail "}
      isLoading={isLoadingBlock}
      {...(block
        ? {
            markdown: detailMarkdown(block),
            actions: (
              <ActionPanel>
                {preferences.openIn === "web" ? (
                  <Action.OpenInBrowser
                    title="Open in browser"
                    url={`https://roamresearch.com/#/app/${graphConfig.nameField}/page/${block[":block/uid"]}`}
                  />
                ) : (
                  <Action.Open
                    title="Open in app"
                    target={`roam://#/app/${graphConfig.nameField}/page/${block[":block/uid"]}`}
                  />
                )}
                {_refs.length ? (
                  <Action.Push
                    title={`Show Linked References(${block[":block/_refs"].length})`}
                    target={<MentioningNotes block={block} graphConfig={graphConfig} />}
                  />
                ) : null}
                {/* {extraActions ? ...extraActions : null} */}
              </ActionPanel>
            ),
            metadata: (
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
            ),
          }
        : {})}
    />
  );
}

export const GraphDetail = ({ graphConfig }: { graphConfig: GraphConfig }) => {
  // const { data } = useGraphAllBlocks(graph.nameField);
  const { removeGraphConfig } = useGraphsConfig();
  const { push, pop } = useNavigation();
  return (
    <List>
      <List.Item
        title="Search graph"
        actions={
          <ActionPanel>
            <Action
              title="Search"
              onAction={() => {
                push(<SingleGraphSearchView graphConfig={graphConfig} />);
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Quick Capture to graph"
        actions={
          <ActionPanel>
            <Action.Push title="Quick Capture" target={<QuickCaptureDetail graphConfig={graphConfig} />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Random Block"
        actions={
          <ActionPanel>
            <Action.Push title="Random Block" target={<RandomBlockFromList graphConfig={graphConfig} />} />
          </ActionPanel>
        }
      />

      {/* Commenting out below because graphsConfig does not cause rerenders when setter called */}
      {/* <List.Item
        title="Remove graph from Raycast"
        actions={
          <ActionPanel>
            <Action
              title="Remove graph"
              onAction={() => {
                removeGraphConfig(graphConfig.nameField);
                removeGraphPeerUrlFromCache(graphConfig.nameField);
                pop();
              }}
            />
          </ActionPanel>
        }
      /> */}
    </List>
  );
};
