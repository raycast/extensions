import { APP_URL } from "@/constants/url";
import { useSelectedApplication } from "@/hooks/use-application";
import { useCurrentWorkspace } from "@/hooks/use-workspace";
import klu from "@/libs/klu";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { intlFormatDistance } from "date-fns";
import { ActionViewDropdown, ActionViewState } from "./action-view";

const ActionDataList = ({ guid, onChange }: { guid: string; onChange: (value: ActionViewState) => void }) => {
  const { selectedApp } = useSelectedApplication();

  const { data, isLoading, revalidate } = useCachedPromise(
    async (actionGuid: string) => {
      const data = await klu.actions.getData(actionGuid);
      const sortedData = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return sortedData;
    },
    [guid],
    {
      execute: guid.length !== 0,
      initialData: [],
    },
  );

  const { workspace } = useCurrentWorkspace();

  return (
    <List
      searchBarPlaceholder="Search data"
      isLoading={isLoading}
      navigationTitle="Results"
      isShowingDetail
      searchBarAccessory={<ActionViewDropdown onChange={onChange} />}
    >
      {data.map((a) => (
        <List.Item
          key={a.guid}
          id={a.guid}
          title={a.input && a.input?.length > 0 ? a.input?.trim() : "No input given"}
          actions={
            <ActionPanel title={a.guid}>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard title="Copy Input" content={a.input ?? ""} />
                <Action.CopyToClipboard title="Copy Output" content={a.output ?? ""} />
                <Action.CopyToClipboard title="Copy Prompt" content={a.fullPromptSent ?? ""} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Link">
                <Action.OpenInBrowser
                  url={`${APP_URL}/${workspace?.slug.toLocaleLowerCase()}/apps/${selectedApp?.id}/data?action=${guid}&guid=${a.guid}`}
                />
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={`${APP_URL}/${workspace?.slug.toLocaleLowerCase()}/apps/${selectedApp?.id}/data?action=${guid}&guid=${a.guid}`}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Miscellaneous">
                <Action icon={Icon.RotateClockwise} title="Refresh" onAction={() => revalidate()} />
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`${a.output ?? "No response"}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Source" text={a.metadata?.source?.toString()} />
                  {a.metadata?.generationCost ? (
                    <List.Item.Detail.Metadata.Label
                      title="Generation cost"
                      text={`$${a.metadata?.generationCost?.toString()}`}
                    />
                  ) : null}
                  {a.latency ? (
                    <List.Item.Detail.Metadata.Label
                      title="Latency"
                      text={`${a.latency?.toString()} ms`}
                      icon={Icon.Bolt}
                    />
                  ) : null}
                  <List.Item.Detail.Metadata.Label
                    title="Created at"
                    text={intlFormatDistance(new Date(a.createdAt), new Date())}
                    icon={Icon.Clock}
                  />
                  {a.numInputTokens && a.metadata?.inputCost ? (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Input token"
                        text={a.numInputTokens?.toString()}
                        icon={Icon.Coins}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Input cost"
                        text={`$${a.metadata?.inputCost?.toString()}`}
                      />
                    </>
                  ) : null}
                  {a.numOutputTokens && a.metadata?.outputCost ? (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Output token"
                        text={a.numOutputTokens?.toString()}
                        icon={Icon.Coins}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Output cost"
                        text={`$${a.metadata?.outputCost?.toString()}`}
                      />
                    </>
                  ) : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
};

export default ActionDataList;
