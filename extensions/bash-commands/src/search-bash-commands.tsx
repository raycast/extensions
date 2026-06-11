import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import bashCommands from "./data/bash-commands.json";

interface BashCommand {
  name: string;
  command: string;
  type: string;
  description: string;
  notes?: string;
}

const MAX_RECENT = 5;
const allCommands = bashCommands as BashCommand[];
const allTypes = ["all", ...Array.from(new Set(allCommands.map((cmd) => cmd.type))).sort()];

function TypeDropdown({ onTypeChange }: { onTypeChange: (type: string) => void }) {
  return (
    <List.Dropdown tooltip="Filter by Type" storeValue onChange={onTypeChange}>
      {allTypes.map((type) => (
        <List.Dropdown.Item key={type} title={type.charAt(0).toUpperCase() + type.slice(1)} value={type} />
      ))}
    </List.Dropdown>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const { value: isShowingDetail, setValue: setIsShowingDetail } = useLocalStorage("isShowingDetail", false);
  const { value: pinnedNames = [], setValue: setPinnedNames } = useLocalStorage<string[]>("pinnedCommands", []);
  const { value: recentNames = [], setValue: setRecentNames } = useLocalStorage<string[]>("recentCommands", []);

  const terms = searchText.toLowerCase().split(" ").filter(Boolean);

  const matches = (cmd: BashCommand) => {
    const searchable = `${cmd.name} ${cmd.command} ${cmd.description}`.toLowerCase();
    const matchesSearch = terms.length === 0 || terms.every((term) => searchable.includes(term));
    const matchesType = selectedType === "all" || cmd.type === selectedType;
    return matchesSearch && matchesType;
  };

  const pinned = (pinnedNames ?? [])
    .map((name) => allCommands.find((cmd) => cmd.name === name))
    .filter((cmd): cmd is BashCommand => cmd !== undefined && matches(cmd));

  const recent = (recentNames ?? [])
    .map((name) => allCommands.find((cmd) => cmd.name === name))
    .filter((cmd): cmd is BashCommand => cmd !== undefined && !(pinnedNames ?? []).includes(cmd.name) && matches(cmd));

  const all = allCommands.filter(
    (cmd) => matches(cmd) && !(pinnedNames ?? []).includes(cmd.name) && !(recentNames ?? []).includes(cmd.name),
  );

  const handlePin = (cmd: BashCommand) => {
    if ((pinnedNames ?? []).includes(cmd.name)) {
      setPinnedNames((pinnedNames ?? []).filter((n) => n !== cmd.name));
    } else {
      setPinnedNames([...(pinnedNames ?? []), cmd.name]);
      setRecentNames((recentNames ?? []).filter((n) => n !== cmd.name));
    }
  };

  const addRecent = (cmd: BashCommand) => {
    const updated = [cmd.name, ...(recentNames ?? []).filter((n) => n !== cmd.name)].slice(0, MAX_RECENT);
    setRecentNames(updated);
  };

  const renderItem = (cmd: BashCommand) => {
    const isPinned = (pinnedNames ?? []).includes(cmd.name);
    return (
      <List.Item
        key={cmd.name}
        title={cmd.name}
        subtitle={!isShowingDetail ? cmd.description : undefined}
        accessories={[...(isPinned ? [{ icon: Icon.Tack }] : []), { tag: cmd.type }]}
        detail={
          <List.Item.Detail
            markdown={`# \`${cmd.command}\`\n\n${cmd.description}${cmd.notes ? `\n\n---\n\n${cmd.notes}` : ""}`}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Command" text={cmd.command} />
                <List.Item.Detail.Metadata.Label title="Type" text={cmd.type} />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Command" content={cmd.command} onCopy={() => addRecent(cmd)} />
            <Action.Paste
              title="Paste Command"
              content={cmd.command}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "return" },
                Windows: { modifiers: ["ctrl"], key: "return" },
              }}
              onPaste={() => addRecent(cmd)}
            />
            <Action
              icon={Icon.AppWindowSidebarRight}
              title="Toggle Detail"
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "y" },
                Windows: { modifiers: ["ctrl"], key: "y" },
              }}
              onAction={() => setIsShowingDetail(!isShowingDetail)}
            />
            <Action
              icon={isPinned ? Icon.TackDisabled : Icon.Tack}
              title={isPinned ? "Unpin" : "Pin"}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "p" },
                Windows: { modifiers: ["ctrl", "shift"], key: "p" },
              }}
              onAction={() => handlePin(cmd)}
            />
            {(recentNames ?? []).length > 0 && (
              <Action
                icon={Icon.XMarkCircle}
                title="Clear Recent"
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "r" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "r" },
                }}
                onAction={() => setRecentNames([])}
              />
            )}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Bash Commands"
      searchBarPlaceholder="Search bash commands"
      isShowingDetail={isShowingDetail}
      searchBarAccessory={<TypeDropdown onTypeChange={setSelectedType} />}
    >
      {pinned.length > 0 && <List.Section title="Pinned">{pinned.map(renderItem)}</List.Section>}
      {recent.length > 0 && <List.Section title="Recent">{recent.map(renderItem)}</List.Section>}
      <List.Section title="All" subtitle={`${all.length}`}>
        {all.map(renderItem)}
      </List.Section>
    </List>
  );
}
