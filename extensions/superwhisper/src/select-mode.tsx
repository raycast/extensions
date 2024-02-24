import { Action, ActionPanel, Icon, Image, List, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { readdirSync } from "fs";
import { homedir } from "os";
import fs from "fs";
import { SUPERWHISPER_BUNDLE_ID, checkSuperwhisperInstallation } from "./utils";

interface State {
  items?: Mode[];
  error?: Error;
}

interface Mode {
  key: string;
  name: string;
}

function handleSelection(item: Mode) {
  const modeKey = item.key;
  const url = `superwhisper://mode?key=${modeKey}`;
  open(url, SUPERWHISPER_BUNDLE_ID);
}

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchModes() {
      const isInstalled = await checkSuperwhisperInstallation();
      if (!isInstalled) {
        setState({ error: new Error("Superwhisper is not installed") });
        return;
      }

      try {
        // read mode json files from Documents/superwhisper/modes folder
        const modes: Mode[] = [];
        const modeDirURL = `${homedir()}/Documents/superwhisper/modes`;
        await readdirSync(modeDirURL).forEach((file) => {
          // make sure its a json file
          if (file.indexOf(".json") == -1) {
            return;
          }
          // read json file
          const data = JSON.parse(fs.readFileSync(`${modeDirURL}/${file}`, "utf8"));
          // add to modes array
          modes.push(data);
        });
        setState({ items: modes });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchModes();
  }, []);

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => (
        <List.Item
          key={item.key}
          icon={getIcon(index + 1)}
          title={item.name || "Default"}
          subtitle={`⌘${index + 1}`}
          // accessories={}
          actions={<Actions item={item} />}
        />
      ))}
    </List>
  );
}

function Actions(props: { item: Mode }) {
  return (
    <ActionPanel title={props.item.name}>
      <ActionPanel.Section>
        <SelectModeAction item={props.item} onSelect={() => handleSelection(props.item)} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function SelectModeAction(props: { item: Mode; onSelect: () => void }) {
  return <Action icon={Icon.Circle} title={`Select ${props.item.name} Mode`} onAction={props.onSelect} />;
}

function getIcon(index: number): Image.ImageLike {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="#333" rx="10"></rect>
  <text
  font-size="22"
  fill="white"
  font-family="Inter"
  text-anchor="middle"
  alignment-baseline="baseline"
  x="20.5"
  y="32.5">${index}</text>
</svg>
  `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
}
