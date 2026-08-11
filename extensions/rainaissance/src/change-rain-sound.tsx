import { Action, ActionPanel, closeMainWindow, List, open, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";

interface AudioFile {
  id: string;
}

interface Manifest {
  version: number;
  last_updated: string;
  audio_files: AudioFile[];
}

export default function Command() {
  const { isLoading, data, error } = useFetch<Manifest>("https://assets.rainaissance.app/manifest.json");

  useEffect(() => {
    if (error && !data) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load sounds",
        message: error.message,
      });
    }
  }, [error, data]);

  return (
    <List isLoading={isLoading}>
      {data?.audio_files.map((sound) => (
        <List.Item
          key={sound.id}
          title={toTitleCase(sound.id)}
          actions={
            <ActionPanel>
              <Action
                title="Change Sound"
                onAction={async () => {
                  await open(`rainaissance://change-sound?name=${sound.id}`);
                  await closeMainWindow();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function toTitleCase(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
