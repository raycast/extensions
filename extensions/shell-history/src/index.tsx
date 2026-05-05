import { useCallback, useMemo, useState } from "react";
import { ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { allShellTags, ShellHistory } from "./types/types";
import { ActionShellCommand } from "./components/action-shell-command";
import { getCliIcon, getShellIcon } from "./utils/shell-utils";
import { useShowDetail } from "./hooks/useShowDetail";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { useShellHistoryZsh } from "./hooks/useShellHistoryZsh";
import { useShellHistoryBash } from "./hooks/useShellHistoryBash";
import { useShellHistoryFish } from "./hooks/useShellHistoryFish";
import { rememberShellTag } from "./types/preferences";

export default function Index() {
  const [shellTag, setShellTag] = useState<string>("All");
  const { data: shellHistoryZshData, isLoading: isLoadingZsh, mutate: mutateZsh } = useShellHistoryZsh();
  const { data: shellHistoryBashData, isLoading: isLoadingBash, mutate: mutateBash } = useShellHistoryBash();
  const { data: shellHistoryFishData, isLoading: isLoadingFish, mutate: mutateFish } = useShellHistoryFish();
  const { data: showDetailData, mutate: showDetailMutate } = useShowDetail();

  const { displayOrder } = getPreferenceValues<{ displayOrder: "newest-first" | "oldest-first" }>();

  const allShellHistory = useMemo(() => {
    const allShellHistory_ = [];
    if (shellHistoryZshData) {
      allShellHistory_.push(shellHistoryZshData);
    }
    if (shellHistoryBashData) {
      allShellHistory_.push(shellHistoryBashData);
    }
    if (shellHistoryFishData) {
      allShellHistory_.push(shellHistoryFishData);
    }
    return allShellHistory_;
  }, [shellHistoryZshData, shellHistoryBashData, shellHistoryFishData]);

  const isLoading = useMemo(() => {
    return isLoadingZsh && isLoadingBash && isLoadingFish;
  }, [isLoadingZsh, isLoadingBash, isLoadingFish]);

  const mutate = useCallback(async () => {
    await mutateZsh();
    await mutateBash();
    await mutateFish();
  }, [mutateZsh, mutateBash, mutateFish]);

  const shellTags = useMemo(() => {
    const shellTags_ = [];
    shellTags_.push({ title: "All", value: "All", icon: Icon.Tag });
    if (shellHistoryZshData && shellHistoryZshData.length > 0) {
      shellTags_.push({ title: allShellTags[0].title, value: allShellTags[0].value, icon: allShellTags[0].icon });
    }
    if (shellHistoryBashData && shellHistoryBashData.length > 0) {
      shellTags_.push({ title: allShellTags[1].title, value: allShellTags[1].value, icon: allShellTags[1].icon });
    }
    if (shellHistoryFishData && shellHistoryFishData.length > 0) {
      shellTags_.push({ title: allShellTags[2].title, value: allShellTags[2].value, icon: allShellTags[2].icon });
    }
    return shellTags_;
  }, [shellHistoryZshData, shellHistoryBashData, shellHistoryFishData]);

  const shellHistory = useMemo(() => {
    if (shellTag === "All") {
      return allShellHistory;
    } else {
      const shellHistory: ShellHistory[][] = [];
      for (let i = 0; i < allShellHistory.length; i++) {
        if (allShellHistory[i].length > 0 && allShellHistory[i][0].shell === shellTag) {
          shellHistory.push(allShellHistory[i]);
          break;
        }
      }
      return shellHistory;
    }
  }, [allShellHistory, shellTag]);

  const showDetail = useMemo(() => {
    return showDetailData === 1;
  }, [showDetailData]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={"Search shell history"}
      isShowingDetail={showDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Shell"
          storeValue={rememberShellTag}
          onChange={(newValue) => {
            setShellTag(newValue);
          }}
        >
          {shellTags.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} icon={value.icon} value={value.value} />;
          })}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Terminal}
        title={"No Commands"}
        actions={
          <ActionPanel>
            <ActionOpenPreferences />
          </ActionPanel>
        }
      />

      {shellHistory.map((shell, shellIndex) => {
        const orderedShell = displayOrder === "oldest-first" ? [...shell].reverse() : shell;
        return (
          orderedShell.length > 0 && (
            <List.Section
              key={orderedShell[0].shell + shellIndex}
              title={orderedShell[0].shell}
              subtitle={orderedShell.length.toString()}
            >
              {orderedShell.map((history, index) => {
                const date = history.timestamp ? new Date(history.timestamp) : undefined;
                const firstCli = history.cli?.length > 0 ? history.cli[0] : undefined;
                return (
                  <List.Item
                    key={`${history.shell}_${index}`}
                    icon={{ source: Icon.Terminal, tintColor: Color.SecondaryText }}
                    title={{ value: history.command.replace("\n", " "), tooltip: history.command }}
                    accessories={
                      showDetail
                        ? undefined
                        : [
                            date
                              ? {
                                  date: date,
                                  icon: Icon.Clock,
                                  tooltip: `Time: ${date.toLocaleString()}`,
                                }
                              : {},
                            {
                              tag: firstCli?.command,
                              icon: getCliIcon(firstCli?.type),
                              tooltip: firstCli ? `${firstCli.type}: ${firstCli?.command}` : "",
                            },
                            {
                              tag: history.shell,
                              icon: getShellIcon(history.shell),
                              tooltip: "Shell: " + history.shell,
                            },
                          ]
                    }
                    detail={
                      <List.Item.Detail
                        markdown={"```" + "\n" + history.command + "\n" + "```"}
                        metadata={
                          <List.Item.Detail.Metadata>
                            {date && <List.Item.Detail.Metadata.Label title="Time" text={date?.toLocaleString()} />}
                            {history.cli?.length > 0 && (
                              <List.Item.Detail.Metadata.TagList title="CLI">
                                {history.cli.map((cliTool, index) => {
                                  return <List.Item.Detail.Metadata.TagList.Item key={index} text={cliTool.command} />;
                                })}
                              </List.Item.Detail.Metadata.TagList>
                            )}
                            <List.Item.Detail.Metadata.Label
                              title="Shell"
                              icon={getShellIcon(history.shell)}
                              text={history.shell}
                            />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionShellCommand
                        shell={history.shell}
                        shellCommand={history.command}
                        cliTool={firstCli}
                        mutate={mutate}
                        showDetail={showDetail}
                        showDetailMutate={showDetailMutate}
                      />
                    }
                  />
                );
              })}
            </List.Section>
          )
        );
      })}
    </List>
  );
}
