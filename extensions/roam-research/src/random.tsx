import { List, Detail, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { keys, detailMarkdown, timeformatFromMs } from "./utils";
import { BLOCK_QUERY, initRoamBackendClient } from "./roamApi";

import * as roamApiSdk from "./roam-api-sdk-copy";
import { MentioningNotes } from "./detail";
import { useGraphsConfig } from "./utils";

// TODO: Feature requests/ideas:
// 1. Ability to pass a filter-like for what sorts of random blocks to get.
//      One example might be to get blocks with more than n back refs. Another might be to get a random back ref of a page

const rand = (max: number) => Math.floor(Math.random() * max);

const isValidBlockPulled = (blockPulled: any) => {
  return (
    blockPulled[":block/uid"] &&
    // block string can be an empty string and still be valid
    (Object.prototype.hasOwnProperty.call(blockPulled, ":block/string") || blockPulled[":node/title"])
  );
};

export const RandomBlockFromList = ({ graphConfig }: { graphConfig: GraphConfig }) => {
  // TODO: the first time, this is getting printed quite a number of times which makes me assume I'm not doing it properly
  // console.log("RandomBlockFromList triggered");

  // const api = graphApi(graph.nameField, graph.tokenField);
  const backendClient = initRoamBackendClient(graphConfig.nameField, graphConfig.tokenField);

  const {
    isLoading: isLoadingRandomBlocks,
    data: dataRandomBlocks,
    error: errorRandomBlocks,
  } = usePromise(
    //useCachedPromise(
    async (graphConfig) => {
      // TODO: maybe try abortable here?
      // const response = await fetch(url, { signal: abortable.current?.signal });
      // const result = await response.text();
      const randomBlockUids: undefined | string[] = await roamApiSdk.q(
        backendClient,
        "[:find (rand 50 ?block-uid) . :in $ :where [?e :block/uid ?block-uid] [?e :block/page _] [?e :block/string _] [_ :block/refs ?e]]"
      );
      if (!randomBlockUids || randomBlockUids.length === 0) {
        return undefined;
      } else {
        const response = await roamApiSdk.q(
          backendClient,
          `[ :find [(pull ?e [${BLOCK_QUERY}]) ...] :in $ [?block-uid ...] :where [?e :block/uid ?block-uid]]`,
          [randomBlockUids]
        );
        return response;
      }
    },
    [graphConfig]
  );

  const { isLoading, data, error, revalidate } = usePromise(
    async (candidateBlocks) => {
      if (!candidateBlocks) return null;
      const validCandidateBlocks = candidateBlocks.filter(isValidBlockPulled);
      if (validCandidateBlocks.length === 0) {
        return null;
      } else {
        let randomBlock: ReversePullBlock;
        do {
          randomBlock = validCandidateBlocks[rand(validCandidateBlocks.length)];
          // console.log("selected random block: ", randomBlock);
        } while (!isValidBlockPulled(randomBlock));
        return randomBlock;
      }
    },
    [dataRandomBlocks]
  );

  const preferences = getPreferenceValues<Preferences>();

  // TODO: handle `errorRandomBlocks` and `error`

  const _refs = data?.[":block/_refs"] || [];

  // console.log("random block data:", JSON.stringify(data));

  return (
    <Detail
      navigationTitle={"Random Note Detail "}
      isLoading={isLoadingRandomBlocks || isLoading}
      {...(data
        ? {
            markdown: detailMarkdown(data),
            actions: (
              <ActionPanel>
                <Action title="Another random block" onAction={revalidate} />
                {preferences.openIn === "web" ? (
                  <Action.OpenInBrowser
                    title="Open in browser"
                    url={`https://roamresearch.com/#/app/${graphConfig.nameField}/page/${data[":block/uid"]}`}
                  />
                ) : (
                  <Action.Open
                    title="Open in app"
                    target={`roam://#/app/${graphConfig.nameField}/page/${data[":block/uid"]}`}
                  />
                )}
                {_refs.length ? (
                  <Action.Push
                    title={`Show Linked References(${data[":block/_refs"].length})`}
                    target={<MentioningNotes block={data} graphConfig={graphConfig} />}
                  />
                ) : null}
              </ActionPanel>
            ),
            metadata: (
              <Detail.Metadata>
                <Detail.Metadata.TagList title="Type">
                  {data[":node/title"] ? (
                    <Detail.Metadata.TagList.Item text="Page" color={"#eed535"} />
                  ) : (
                    <Detail.Metadata.TagList.Item text="Block" color={"#7AE1D8"} />
                  )}
                </Detail.Metadata.TagList>
                <Detail.Metadata.Label title="Linked References" text={_refs.length + ""} />
                <Detail.Metadata.Label title="edit time" text={`${timeformatFromMs(data[":edit/time"])}`} />
                <Detail.Metadata.Label title="create time" text={`${timeformatFromMs(data[":create/time"])}`} />
              </Detail.Metadata>
            ),
          }
        : {})}
    />
  );
};

export default function Random() {
  // TODO: look into Roam's serendipity plugin, random block plugin and if they offer any customizations
  const { graphsConfig } = useGraphsConfig();
  // console.log("Random: graphsConfig", "---", graphsConfig);
  return (
    <List>
      {graphsConfig &&
        keys(graphsConfig).map((graphName) => {
          return (
            <List.Item
              key={graphName}
              title={graphName}
              icon={Icon.Shuffle}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Shuffle}
                    title="Random Block"
                    target={<RandomBlockFromList graphConfig={graphsConfig[graphName]} />}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
