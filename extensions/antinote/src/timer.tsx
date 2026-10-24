import { closeMainWindow, List, Action, ActionPanel, Detail } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { checkAntinoteInstalled } from "./utils";
import { useState, useEffect } from "react";

type Item = {
  id: string;
  command: string;
  title: string;
  subtitle?: string;
};

const listItems: Item[] = [
  { id: "stopwatch", command: "", title: "Start stopwatch" },
  { id: "pomo", command: "pomo", title: "Start a 25 minutes / 5 minutes pomodoro timer" },
  { id: "pause", command: "p", title: "Pause / resume timer" },
  { id: "reset", command: "r", title: "Reset timer" },
  { id: "stop", command: "s", title: "Stop timer" },
  { id: "breathe", command: "breathe", title: "Start breathing session" },
];

async function execCommand(command: string) {
  try {
    await runAppleScript(
      `tell application "Antinote"
        activate
        delay 0.3
        open location "antinote://x-callback-url/timer?command=${encodeURIComponent(command)}"
      end tell`,
    );

    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to execute timer command in Antinote" });
  }
}

function getLabel(command: string) {
  if (command.startsWith("s")) {
    return "Stop timer";
  }

  if (command.startsWith("pomo")) {
    return "Start 25 minutes / 5 minutes pomodoro timer";
  }

  if (command.startsWith("p")) {
    return "Pause / resume timer";
  }

  if (command.startsWith("r")) {
    return "Reset timer";
  }

  if (command.startsWith("breathe")) {
    return "Start breathing session";
  }

  const timerRe = new RegExp(/^([0-9]+)?(:[0-9]*)?[^:0-9]*$/);
  const timerLabelRe = new RegExp(/^([0-9]+)?(:[0-9]*)?[^:]*(:.+)$/);
  const pomoRe = new RegExp(/^([0-9]+)?(:[0-9]*)?\s([0-9][0-9]*)(:[0-9]*)?\s?$/);

  const matchTimer = timerRe.exec(command);
  if (matchTimer) {
    const minutes = matchTimer[1] || "0";
    const seconds = ((matchTimer[2] || "0").replace(":", "") || "0").trim();

    return `Start timer for ${minutes} minutes and ${seconds} seconds`;
  }

  const matchPomo = pomoRe.exec(command);
  if (matchPomo) {
    const minutes1 = matchPomo[1] || "0";
    const seconds1 = ((matchPomo[2] || "0").replace(":", "") || "0").trim();

    const minutes2 = matchPomo[3] || "0";
    const seconds2 = ((matchPomo[4] || "0").replace(":", "") || "0").trim();

    return `Start custom ${minutes1} minutes and ${seconds1} seconds / ${minutes2} minutes and ${seconds2} seconds Pomodoro timer`;
  }

  const matchTimerLabel = timerLabelRe.exec(command);
  if (matchTimerLabel) {
    const minutes = matchTimerLabel[1] || "0";
    const seconds = ((matchTimerLabel[2] || "0").replace(":", "") || "0").trim();
    const label = (matchTimerLabel[3] || "").replace(":", "").trim();

    return `Start timer for ${minutes} minutes and ${seconds} seconds with label "${label}"`;
  }

  return "Start stopwatch";
}

export default function Command() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [searchText, setSearchedText] = useState<string>("");
  const [filteredList, filterList] = useState<Item[]>(listItems);

  useEffect(() => {
    async function checkInstallation() {
      const { installed, version } = await checkAntinoteInstalled();
      setIsInstalled(installed);
      setVersion(version);
    }

    checkInstallation();
  }, []);

  useEffect(() => {
    if (searchText === "") {
      filterList(listItems);
    } else {
      filterList([
        {
          id: "custom",
          command: searchText,
          title: searchText,
          subtitle: getLabel(searchText),
        },
      ]);
    }
  }, [searchText]);

  if (isInstalled === null) {
    return <List isLoading={true} />;
  }

  if (isInstalled === false) {
    return <Detail markdown="Antinote is not installed." />;
  }

  if (version !== "beta") {
    return <Detail markdown="Remote timer controls are only available in Antinote v2.* (beta)" />;
  }

  return (
    <List
      searchBarPlaceholder="Pick a command or type time to start a timer..."
      onSearchTextChange={setSearchedText}
      filtering={false}
    >
      {filteredList.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle || ""}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Execute Command" onAction={() => execCommand(item.command)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
