import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { TRANS_SERVICES_NAMES } from "./const";
import { clearAllHistory, getHistories } from "./itranslate.shared";
import { useEffect, useState } from "react";

export function TranslateHistory() {
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [historiesState, updateHistoriesState] = useState<TransHistory[]>([]);

  useEffect(() => {
    updateLoadingState(true);
    updateHistoriesState(getHistories());
    updateLoadingState(false);
  }, []);

  return (
    <List isLoading={isLoadingState} isShowingDetail={historiesState.length !== 0}>
      <List.EmptyView title="No translation histories..." />
      {historiesState.map((history) => {
        return (
          <List.Item
            key={history.time}
            title={history.text}
            accessories={[{ date: new Date(history.time) }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="" text={`${history.from} -> ${history.to}`} />
                    <List.Item.Detail.Metadata.Separator />
                    {history.transList.map((tran) => {
                      return (
                        <List.Item.Detail.Metadata.Label
                          key={tran.serviceProvider}
                          title={TRANS_SERVICES_NAMES.get(tran.serviceProvider) || ""}
                          text={tran.res}
                        />
                      );
                    })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Submenu icon={Icon.Clipboard} title="Copy Result to Clipboard">
                  {history.transList.map((tran) => {
                    return (
                      <Action.CopyToClipboard
                        key={tran.serviceProvider}
                        icon={{ source: `${tran.serviceProvider}.png` }}
                        title={TRANS_SERVICES_NAMES.get(tran.serviceProvider)}
                        content={tran.res}
                      />
                    );
                  })}
                </ActionPanel.Submenu>
                <Action.CopyToClipboard title="Copy Source to Clipboard" content={history.text} />
                <Action
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  title="Clear All Histories"
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={() => {
                    confirmAlert({
                      title: "Clear all histories?",
                      icon: Icon.Trash,
                      message: `All histories will be permanently cleared`,
                      primaryAction: {
                        title: "Clear",
                        style: Alert.ActionStyle.Destructive,
                        onAction: () => {
                          clearAllHistory();
                          updateHistoriesState([]);
                          showToast({
                            style: Toast.Style.Success,
                            title: "All histories cleared",
                          });
                        },
                      },
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
