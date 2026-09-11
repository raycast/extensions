import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import {
  deleteRecent,
  loadRecents,
  openInShowmd,
  openTargetCommand,
} from "./lib/raycast-glue";
import { tildify, type RecentEntry } from "./lib/showmd";
import FeedbackSection from "./components/FeedbackSection";
import { useToastLoader } from "./hooks/use-toast-loader";
import path from "node:path";

export default function Open() {
  const { isLoading, run } = useToastLoader("Could not load recents");
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  async function refresh() {
    await run(async () => {
      const list = await loadRecents();
      setRecents(list);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleRemove(entry: RecentEntry) {
    const ok = await deleteRecent(entry.path);
    if (ok) {
      setRecents((prev) => prev.filter((e) => e.path !== entry.path));
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove from recents",
      });
    }
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Open">
        <List.Item
          key="browse-folder"
          icon={Icon.Folder}
          title="Browse Folder"
          actions={
            <ActionPanel>
              <Action
                title="Browse Folder"
                icon={Icon.Folder}
                onAction={() => openTargetCommand("folder")}
              />
              <FeedbackSection />
            </ActionPanel>
          }
        />
        <List.Item
          key="browse-files"
          icon={Icon.Document}
          title="Browse Files"
          actions={
            <ActionPanel>
              <Action
                title="Browse Files"
                icon={Icon.Document}
                onAction={() => openTargetCommand("file")}
              />
              <FeedbackSection />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Recent">
        {recents.map((entry) => (
          <List.Item
            key={entry.path}
            icon={Icon.Document}
            title={path.basename(entry.path)}
            subtitle={tildify(path.dirname(entry.path))}
            accessories={[{ date: new Date(entry.ts) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Open"
                  icon={Icon.ArrowRight}
                  onAction={() => openInShowmd(entry.path)}
                />
                <Action
                  title="Open Containing Folder"
                  icon={Icon.Folder}
                  onAction={() => openInShowmd(path.dirname(entry.path))}
                />
                <Action.ShowInFinder path={entry.path} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={entry.path}
                />
                <Action
                  title="Remove from Recents"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemove(entry)}
                />
                <FeedbackSection />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
