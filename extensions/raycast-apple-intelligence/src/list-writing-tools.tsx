import { Action, ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { executeWritingToolCommand } from "./api";
import { CommandNumber, CommandTitle } from "./Command";

const commands = [
  { title: CommandTitle.PROOFREAD, number: CommandNumber.PROOFREAD, icon: Icon.MagnifyingGlass, category: "On Device" },
  {
    title: CommandTitle.REWRITE,
    number: CommandNumber.REWRITE,
    icon: Icon.ArrowCounterClockwise,
    category: "On Device",
  },
  { title: CommandTitle.MAKE_FRIENDLY, number: CommandNumber.MAKE_FRIENDLY, icon: Icon.Emoji, category: "On Device" },
  {
    title: CommandTitle.MAKE_PROFESSIONAL,
    number: CommandNumber.MAKE_PROFESSIONAL,
    icon: Icon.Building,
    category: "On Device",
  },
  {
    title: CommandTitle.MAKE_CONCISE,
    number: CommandNumber.MAKE_CONCISE,
    icon: Icon.ShortParagraph,
    category: "On Device",
  },
  {
    title: CommandTitle.SUMMARIZE,
    number: CommandNumber.SUMMARIZE,
    icon: Icon.Document,
    category: "Private Cloud Compute",
  },
  {
    title: CommandTitle.CREATE_KEY_POINTS,
    number: CommandNumber.CREATE_KEY_POINTS,
    icon: Icon.BulletPoints,
    category: "Private Cloud Compute",
  },
  {
    title: CommandTitle.MAKE_LIST,
    number: CommandNumber.MAKE_LIST,
    icon: Icon.NumberList,
    category: "Private Cloud Compute",
  },
  {
    title: CommandTitle.MAKE_TABLE,
    number: CommandNumber.MAKE_TABLE,
    icon: Icon.AppWindowGrid2x2,
    category: "Private Cloud Compute",
  },
  {
    title: CommandTitle.COMPOSE,
    number: CommandNumber.COMPOSE,
    icon: Icon.Pencil,
    category: "OpenAI",
  },
];

export default function Command() {
  const [pinnedCommands, setPinnedCommands] = useState<string[]>([]);

  useEffect(() => {
    async function loadPinnedCommands() {
      const storedPinsString = await LocalStorage.getItem<string>("pinnedCommands");
      if (storedPinsString) {
        const storedPins = JSON.parse(storedPinsString) as string[];
        setPinnedCommands(storedPins);
      }
    }
    loadPinnedCommands();
  }, []);

  const togglePin = async (title: string) => {
    let updatedPins = [...pinnedCommands];
    if (pinnedCommands.includes(title)) {
      updatedPins = updatedPins.filter((cmd) => cmd !== title);
    } else {
      updatedPins.push(title);
    }
    setPinnedCommands(updatedPins);
    await LocalStorage.setItem("pinnedCommands", JSON.stringify(updatedPins));
  };

  const movePin = async (title: string, direction: "up" | "down") => {
    console.log(title, direction, pinnedCommands);
    const index = pinnedCommands.findIndex((cmd) => cmd === title);
    if (index === -1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pinnedCommands.length) return;
    const updatedPins = [...pinnedCommands];
    [updatedPins[index], updatedPins[newIndex]] = [updatedPins[newIndex], updatedPins[index]];
    console.log(updatedPins);
    setPinnedCommands(updatedPins);
    await LocalStorage.setItem("pinnedCommands", JSON.stringify(updatedPins));
  };

  const renderCommands = (category: string) => {
    return commands
      .filter((cmd) => cmd.category === category && !pinnedCommands.includes(cmd.title))
      .map((cmd) => (
        <List.Item
          key={cmd.title}
          title={cmd.title}
          icon={cmd.icon}
          accessories={
            cmd.category === "On Device"
              ? [{ tag: { value: `Local`, color: Color.Green }, icon: Icon.HardDrive }]
              : [{ tag: { value: `Server`, color: Color.Blue }, icon: Icon.Network }]
          }
          actions={
            <ActionPanel>
              <Action
                title={"Execute Command"}
                onAction={() => executeWritingToolCommand(cmd.number, cmd.title)}
                icon={cmd.icon}
              />
              <Action
                title={pinnedCommands.includes(cmd.title) ? "Unpin" : "Pin"}
                icon={pinnedCommands.includes(cmd.title) ? Icon.PinDisabled : Icon.Pin}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => togglePin(cmd.title)}
              />
            </ActionPanel>
          }
        />
      ));
  };

  return (
    <List>
      {pinnedCommands.length > 0 && (
        <List.Section title="Pinned">
          {pinnedCommands
            .map((cmd) => commands.find((x) => x.title == cmd))
            .map((cmd) => (
              <List.Item
                key={cmd!.title}
                title={cmd!.title}
                icon={cmd!.icon}
                accessories={
                  cmd!.category === "On Device"
                    ? [{ tag: { value: `Local`, color: Color.Green }, icon: Icon.HardDrive }]
                    : [{ tag: { value: `Server`, color: Color.Blue }, icon: Icon.Network }]
                }
                actions={
                  <ActionPanel>
                    <Action
                      title={"Execute Command"}
                      onAction={() => executeWritingToolCommand(cmd!.number, cmd!.title)}
                      icon={cmd!.icon}
                    />
                    <Action
                      title={pinnedCommands.includes(cmd!.title) ? "Unpin" : "Pin"}
                      icon={pinnedCommands.includes(cmd!.title) ? Icon.PinDisabled : Icon.Pin}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={() => togglePin(cmd!.title)}
                    />
                    <Action
                      title="Move Pin Up"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                      onAction={() => movePin(cmd!.title, "up")}
                    />
                    <Action
                      title="Move Pin Down"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                      onAction={() => movePin(cmd!.title, "down")}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}
      <List.Section title="On Device">{renderCommands("On Device")}</List.Section>
      <List.Section title="Private Cloud Compute">{renderCommands("Private Cloud Compute")}</List.Section>
      <List.Section title="OpenAI">{renderCommands("OpenAI")}</List.Section>
    </List>
  );
}
