import React, { useState } from "react";
import { Icon, List } from "@raycast/api";
import { useShellHistory } from "./hooks/useShellHistory";
import { shellTags } from "./types/types";
import { ActionShellCommand } from "./components/action-shell-command";
import { extractCliTool, getShellIcon, isEmpty } from "./utils/shell-utils";

export default function Index() {
  const [shellTag, setShellTag] = useState<string>(shellTags[0].value);
  const { data, isLoading, mutate } = useShellHistory();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={"Search shell history"}
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
      <List.EmptyView icon={Icon.Terminal} title={"No Commands"} />

      {data?.map((shell, shellIndex) => {
        return (
          shell.length > 0 &&
          (shell[0].shell === shellTag || shellTag === shellTags[0].value) && (
            <List.Section key={shell[0].shell + shellIndex} title={shell[0].shell} subtitle={shell.length.toString()}>
              {shell.map((history, index) => {
                const date = history.timestamp ? new Date(history.timestamp) : undefined;
                const cliTool = extractCliTool(history.command);
                return (
                  <List.Item
                    key={`${history.shell}_${index}`}
                    icon={Icon.Terminal}
                    title={{ value: history.command, tooltip: history.command }}
                    accessories={[
                      date
                        ? {
                            date: date,
                            icon: Icon.Clock,
                            tooltip: `Time: ${date.toLocaleString()}`,
                          }
                        : {},
                      {
                        tag: isEmpty(cliTool?.value) ? history.command : cliTool?.value,
                        icon: cliTool?.icon,
                        tooltip: cliTool
                          ? `${cliTool.type}: ${isEmpty(cliTool?.value) ? history.command : cliTool?.value}`
                          : "",
                      },
                      {
                        tag: history.shell,
                        icon: getShellIcon(history.shell),
                        tooltip: "Shell: " + history.shell,
                      },
                    ]}
                    actions={
                      <ActionShellCommand
                        shell={history.shell}
                        shellCommand={history.command}
                        cliTool={cliTool}
                        mutate={mutate}
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
