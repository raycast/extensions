import { ActionPanel, Detail, Action, List, getPreferenceValues, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { debounce } from "debounce";
import { initRoamBackendClient, getBackRefs } from "./roamApi";
import { detailMarkdown, timeformatFromMs } from "./utils";

export const OpenInRoamActions = ({ graphName, blockUid }: { graphName: string; blockUid?: string }) => {
  const preferences = getPreferenceValues<Preferences>();
  const suffix = blockUid ? `/page/${blockUid}` : "";
  const browserUrl = `https://roamresearch.com/#/app/${graphName}${suffix}`;
  const appUrl = `roam://#/app/${graphName}${suffix}`;
  return preferences.openIn === "web" ? (
    <>
      <Action.OpenInBrowser title="Open in Browser" url={browserUrl} />
      <Action.Open title="Open in App" target={appUrl} />
    </>
  ) : (
    <>
      <Action.Open title="Open in App" target={appUrl} />
      <Action.OpenInBrowser title="Open in Browser" url={browserUrl} />
    </>
  );
};

export function MentioningNotes({ block, graphConfig }: { block: ReversePullBlock; graphConfig: GraphConfig }) {
  const { isLoading, data } = usePromise(() => {
    return getBackRefs(initRoamBackendClient(graphConfig.nameField, graphConfig.tokenField), block[":block/uid"]);
  });
  return (
    <SelectedBlocksSearchView blocks={data || []} showAllFirst={true} graphConfig={graphConfig} isLoading={isLoading} />
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
  const _refs = block?.[":block/_refs"] || [];
  return (
    <Detail
      navigationTitle={"Note Detail"}
      isLoading={isLoadingBlock}
      {...(block
        ? {
            markdown: detailMarkdown(block),
            actions: (
              <ActionPanel>
                <OpenInRoamActions graphName={graphConfig.nameField} blockUid={block[":block/uid"]} />
                {_refs.length ? (
                  <Action.Push
                    title={`Show Linked References (${_refs.length})`}
                    target={<MentioningNotes block={block} graphConfig={graphConfig} />}
                  />
                ) : null}
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

export const SelectedBlocksSearchView = ({
  graphConfig,
  blocks,
  isLoading,
  showAllFirst,
  title,
}: {
  graphConfig: GraphConfig;
  blocks: ReversePullBlock[];
  isLoading?: boolean;
  showAllFirst?: boolean;
  title?: string;
}) => {
  const [filteredList, setFilteredList] = useState<ReversePullBlock[]>(showAllFirst ? blocks : []);
  const [filterQuery, setFilterQuery] = useState("");
  // Re-sync filteredList when blocks load asynchronously (useState initializer only runs once)
  useEffect(() => {
    if (showAllFirst && blocks.length > 0 && !filterQuery) {
      setFilteredList(blocks);
    }
  }, [blocks, showAllFirst, filterQuery]);
  const changeResult = useMemo(
    () =>
      debounce((text: string) => {
        text = text.trim();
        if (!text || text.length < 2) {
          if (showAllFirst) {
            setFilterQuery("");
            setFilteredList(blocks);
          }
          return;
        }
        setFilterQuery(text);
        const keywords = text.split(" ");
        setFilteredList(
          blocks.filter((item) => {
            const s = item[":block/string"] || item[":node/title"] || "";
            return keywords.every((keyword) => s.includes(keyword));
          })
        );
      }, 100),
    [blocks]
  );
  useEffect(() => () => changeResult.clear(), [changeResult]);
  const { push } = useNavigation();
  return (
    <List
      navigationTitle={title || graphConfig.nameField}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder="At least two texts to filter"
      onSearchTextChange={(text) => {
        changeResult(text);
      }}
      isLoading={isLoading}
    >
      {filteredList.map((block) => {
        return (
          <List.Item
            key={block[":block/uid"]}
            title={block[":block/string"] || block[":node/title"] || ""}
            detail={<List.Item.Detail markdown={detailMarkdown(block, filterQuery)} />}
            actions={
              <ActionPanel>
                <Action
                  title="Quick Look"
                  onAction={() => {
                    push(<BlockDetail block={block} graphConfig={graphConfig} />);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};
