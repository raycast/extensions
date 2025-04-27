import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { homedir } from "os";
import { join } from "path";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { format } from "date-fns";

interface Recording {
  directory: string;
  meta: {
    rawResult: string;
    // その他のメタデータフィールド
  };
  timestamp: Date;
}

export default function Command() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = () => {
    try {
      const recordingsPath = join(homedir(), "Documents", "superwhisper", "recordings");

      if (!existsSync(recordingsPath)) {
        setError("Recording directory not found. Please make a recording first.");
        setIsLoading(false);
        return;
      }

      const directories = readdirSync(recordingsPath)
        .filter((dir) => /^\d+$/.test(dir))
        .map((dir) => ({
          dir,
          path: join(recordingsPath, dir),
        }));

      if (directories.length === 0) {
        setError("No recordings found. Please make a recording first.");
        setIsLoading(false);
        return;
      }

      const recordingsList = directories.map((directory) => {
        const metaPath = join(directory.path, "meta.json");
        const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
        const stats = statSync(metaPath);

        return {
          directory: directory.dir,
          meta,
          timestamp: stats.mtime,
        };
      });

      // 日付の新しい順にソート
      recordingsList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setRecordings(recordingsList);
    } catch (error) {
      console.error("Error loading recordings:", error);
      setError("An error occurred while loading recordings.");
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error"
          description={error}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {recordings.map((recording) => (
        <List.Item
          key={recording.directory}
          icon={Icon.Document}
          title={format(recording.timestamp, "yyyy/MM/dd HH:mm:ss")}
          detail={
            <List.Item.Detail
              markdown={recording.meta.rawResult}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Directory"
                    text={recording.directory}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.ShowInFinder
                title="Show in Finder"
                path={join(homedir(), "Documents", "superwhisper", "recordings", recording.directory)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
