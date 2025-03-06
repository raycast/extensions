import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  environment,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { TRANS_SERVICES_NAMES } from "../common/const";
import { clearAllHistory, getHistories, getLang } from "../common/itranslate.shared";
import { useEffect, useState } from "react";

export function TranslateHistory() {
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [historiesState, updateHistoriesState] = useState<ITransHistory[]>([]);

  useEffect(() => {
    updateLoadingState(true);
    updateHistoriesState(getHistories());
    updateLoadingState(false);
  }, []);

  function ListAccessories(history: ITransHistory) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessories: any[] = [{ date: new Date(history.time) }];
    if (history.isMultiple) {
      accessories.unshift({
        icon: { source: Icon.Ellipsis, tintColor: Color.Orange },
        tooltip: "Translated into multiple languages",
      });
    }
    return accessories;
  }

  function HistoryMetadata(history: ITransHistory) {
    if (history.isMultiple) {
      return (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title=""
            text={TRANS_SERVICES_NAMES.get(history.multipleServiceProvider)}
            icon={{ source: `${history.multipleServiceProvider}.png` }}
          />
          <List.Item.Detail.Metadata.Separator />
          {(history.toList || []).map((tran) => {
            return (
              <List.Item.Detail.Metadata.Label
                key={tran.to}
                title={`-> ${getLang(tran.to).langTitle}`}
                text={tran.res}
                icon={tran.res ? null : { source: Icon.XMarkCircle, tintColor: Color.Red }}
              />
            );
          })}
        </List.Item.Detail.Metadata>
      );
    } else {
      return (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title=""
            text={`${getLang(history.from).langTitle} -> ${getLang(history.to || "").langTitle}`}
          />
          <List.Item.Detail.Metadata.Separator />
          {(history.transList || []).map((tran) => {
            return (
              <List.Item.Detail.Metadata.Label
                key={tran.serviceProvider}
                title={TRANS_SERVICES_NAMES.get(tran.serviceProvider) || ""}
                text={tran.res}
                icon={tran.res ? null : { source: Icon.XMarkCircle, tintColor: Color.Red }}
              />
            );
          })}
        </List.Item.Detail.Metadata>
      );
    }
  }

  function CopyResSubmenu(props: { history: ITransHistory }) {
    if (props.history.isMultiple) {
      return (
        <ActionPanel.Submenu icon={Icon.Clipboard} title="Copy Result to Clipboard">
          {(props.history.toList || []).map((tran) => {
            return (
              <Action.CopyToClipboard key={tran.to} title={`-> ${getLang(tran.to).langTitle}`} content={tran.res} />
            );
          })}
        </ActionPanel.Submenu>
      );
    } else {
      return (
        <ActionPanel.Submenu icon={Icon.Clipboard} title="Copy Result to Clipboard">
          {(props.history.transList || []).map((tran) => {
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
      );
    }
  }

  return (
    <List isLoading={isLoadingState} isShowingDetail={historiesState.length !== 0}>
      <List.EmptyView title="No translation histories..." icon={{ source: `no-view@${environment.theme}.png` }} />
      {historiesState.map((history) => {
        return (
          <List.Item
            key={history.time}
            title={history.text || ""}
            accessories={ListAccessories(history)}
            detail={<List.Item.Detail metadata={HistoryMetadata(history)} />}
            actions={
              <ActionPanel>
                <CopyResSubmenu history={history} />
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
