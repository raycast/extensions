import { useMemo, useState } from "react";
import { ActionPanel, Icon, List } from "@raycast/api";
import { useShellHistory } from "./hooks/useShellHistory";
import { allShellTags, ShellHistory } from "./types/types";
import { ActionShellCommand } from "./components/action-shell-command";
import { getCliIcon, getShellIcon } from "./utils/shell-utils";
import { useShowDetail } from "./hooks/useShowDetail";
import { ActionOpenPreferences } from "./components/action-open-preferences";

export default function Index() {
  const [shellTag, setShellTag] = useState<string>("All");
  const { data: shellHistoryData, isLoading, mutate } = useShellHistory();
  const { data: showDetailData, mutate: showDetailMutate } = useShowDetail();

  const allsShellHistory = useMemo(() => {
    return shellHistoryData;
  }, [shellHistoryData]);

  const shellTags = useMemo(() => {
    const shellTags_ = [];
    shellTags_.push({ title: "All", value: "All", icon: Icon.Tag });
    allsShellHistory?.forEach((shell, index) => {
      if (shell.length > 0) {
        const tag = allShellTags[index];
        shellTags_.push({ title: tag.title, value: tag.value, icon: tag.icon });
      }
    });
    return shellTags_;
  }, [allsShellHistory]);

  const shellHistory = useMemo(() => {
    if (shellTag === shellTags[0].title) {
      return allsShellHistory;
    } else {
      const shellHistory: ShellHistory[][] = [];
      for (let i = 0; i < allsShellHistory.length; i++) {
        if (allsShellHistory[i].length > 0 && allsShellHistory[i][0].shell === shellTag) {
          shellHistory.push(allsShellHistory[i]);
        }
      }
      return shellHistory;
    }
  }, [allsShellHistory, shellTag]);

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
          storeValue={true}
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

      {shellHistory?.map((shell, shellIndex) => {
        return (
          shell.length > 0 && (
            <List.Section key={shell[0].shell + shellIndex} title={shell[0].shell} subtitle={shell.length.toString()}>
              {shell.map((history, index) => {
                const date = history.timestamp ? new Date(history.timestamp) : undefined;
                const firstCli = history.cli?.length > 0 ? history.cli[0] : undefined;
                return (
                  <List.Item
                    key={`${history.shell}_${index}`}
                    icon={Icon.Terminal}
                    title={{ value: history.command.replace("\n", " "), tooltip: history.command }}
                    accessories={
                      showDetail
                        ? []
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
                        markdown={"```" + "\n" + history.command + "\n```"}
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
                            <List.Item.Detail.Metadata.Label title="Shell" icon={getShellIcon(history.shell)} />
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
