import { Icon, List, ActionPanel, Action, LocalStorage, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { executeWritingToolCommand } from "./api";

const commands = [
  { title: "Proofread", icon: Icon.MagnifyingGlass, category: "On Device" },
  { title: "Rewrite", icon: Icon.ArrowCounterClockwise, category: "On Device" },
  { title: "Make Friendly", icon: Icon.Emoji, category: "On Device" },
  { title: "Make Professional", icon: Icon.Building, category: "On Device" },
  { title: "Make Concise", icon: Icon.ShortParagraph, category: "On Device" },
  { title: "Summarize", icon: Icon.Document, category: "Private Cloud Compute" },
  { title: "Create Key Points", icon: Icon.BulletPoints, category: "Private Cloud Compute" },
  { title: "Make List", icon: Icon.NumberList, category: "Private Cloud Compute" },
  { title: "Make Table", icon: Icon.AppWindowGrid2x2, category: "Private Cloud Compute" },
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
              <Action title={"Execute Command"} onAction={() => executeWritingToolCommand(cmd.title)} icon={cmd.icon} />
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
                      onAction={() => executeWritingToolCommand(cmd!.title)}
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
    </List>
  );
}
