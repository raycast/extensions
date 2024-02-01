import klu from "@/libs/klu";
import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { intlFormatDistance } from "date-fns";
import { ActionViewDropdown, ActionViewState } from "./action-view";

const ActionDataList = ({ guid, onChange }: { guid: string; onChange: (value: ActionViewState) => void }) => {
  const { data, isLoading } = useCachedPromise(
    async (actionGuid: string) => {
      const data = await klu.actions.getData(actionGuid);
      return data;
    },
    [guid],
    {
      execute: guid.length !== 0,
      /*       keepPreviousData: true, */
      initialData: [],
    },
  );

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
