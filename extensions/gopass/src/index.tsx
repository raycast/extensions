import { Action, ActionPanel, Clipboard, closeMainWindow, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import gopass from "./gopass";

async function copyPassword(entry: string): Promise<void> {
  try {
    const toast = await showToast({ title: "Copying password", style: Toast.Style.Animated });
    await gopass.clip(entry);
    await toast.hide();
    await closeMainWindow();
    await showHUD("Password copied");
  } catch (error) {
    console.error(error);
    await showToast({ title: "Could not copy password", style: Toast.Style.Failure });
  }
}

async function pastePassword(entry: string): Promise<void> {
  try {
    const toast = await showToast({ title: "Pasting password", style: Toast.Style.Animated });
    const password = await gopass.password(entry);
    await Clipboard.paste(password);
    await toast.hide();
    await closeMainWindow();
    await showHUD("Password pasted");
  } catch (error) {
    console.error(error);
    await showToast({ title: "Could not paste password", style: Toast.Style.Failure });
  }
}

export default function (): JSX.Element {
  const [entries, setEntries] = useState<string[]>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect((): void => {
    gopass
      .list()
      .then(setEntries)
      .catch(async (error) => {
        console.error(error);
        await showToast({ title: "Could not load passwords", style: Toast.Style.Failure });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <List isLoading={loading}>
      {entries?.map((entry, i) => (
        <List.Item
          key={i}
          title={entry}
          actions={
            <ActionPanel>
              <Action title="Copy Password to Clipboard" icon={Icon.Clipboard} onAction={() => copyPassword(entry)} />
              <Action title="Paste Password" icon={Icon.Document} onAction={() => pastePassword(entry)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
