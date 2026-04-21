import { ActionPanel, Action, List, Icon, Color, open, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

interface Space {
  id: number;
  index: number;
  name: string;
  isCurrent: boolean;
  displayUUID: string;
  displayIndex: number;
  icon: string | null;
  colorIndex: number | null;
  colorHex: string;
}

const STATE_FILE = "/tmp/spacejump-state.json";

async function getSpaces(): Promise<Space[]> {
  if (!existsSync(STATE_FILE)) {
    throw new Error("SpaceJump state file not found. Is SpaceJump running?");
  }
  const data = await readFile(STATE_FILE, "utf-8");
  return JSON.parse(data);
}

export default function Command() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSpaces()
      .then(setSpaces)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Type space name to jump...">
      {spaces
        .filter((s) => !s.isCurrent)
        .map((space) => (
          <List.Item
            key={String(space.id)}
            icon={{ source: Icon.Dot, tintColor: space.colorHex as Color }}
            title={space.name}
            subtitle={`Desktop ${space.index}`}
            actions={
              <ActionPanel>
                <Action
                  title="Jump"
                  icon={Icon.ArrowRight}
                  onAction={async () => {
                    await open(`spacejump://switch?name=${encodeURIComponent(space.name)}`);
                    await popToRoot();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
