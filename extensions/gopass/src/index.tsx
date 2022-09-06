import { Action, ActionPanel, Clipboard, closeMainWindow, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import gopass from "./gopass";
import Details from "./details";
import { isDirectory } from "./utils";

export async function copyPassword(entry: string): Promise<void> {
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

export async function pastePassword(entry: string): Promise<void> {
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

export async function copyOTP(entry: string): Promise<void> {
  try {
    const toast = await showToast({ title: "Copying OTP", style: Toast.Style.Animated });
    const otp = await gopass.otp(entry);
    await Clipboard.copy(otp);
    await toast.hide();
    await closeMainWindow();
    await showHUD("OTP copied");
  } catch (error) {
    console.error(error);
    await showToast({ title: "Could not copy OTP code", style: Toast.Style.Failure });
  }
}

export async function pasteOTP(entry: string): Promise<void> {
  try {
    const toast = await showToast({ title: "Pasting OTP", style: Toast.Style.Animated });
    const otp = await gopass.otp(entry);
    await Clipboard.paste(otp);
    await toast.hide();
    await closeMainWindow();
    await showHUD("OTP pasted");
  } catch (error) {
    console.error(error);
    await showToast({ title: "Could not paste OTP code", style: Toast.Style.Failure });
  }
}

const passwordActions = (entry: string) => (
  <>
    <Action title="Copy Password to Clipboard" icon={Icon.Clipboard} onAction={() => copyPassword(entry)} />
    <Action
      title="Paste Password to Active App"
      icon={Icon.Document}
      onAction={() => pastePassword(entry)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
    />
    <Action
      title="Copy OTP Code to Clipboard"
      icon={Icon.Clipboard}
      onAction={() => copyOTP(entry)}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
    />
    <Action
      title="Paste OTP Code to Active App"
      icon={Icon.Document}
      onAction={() => pasteOTP(entry)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
    />
  </>
);

const getIcon = (entry: string) => (isDirectory(entry) ? Icon.Folder : Icon.Key);

const getTarget = (entry: string) => (isDirectory(entry) ? <Main prefix={entry} /> : <Details entry={entry} />);

export default function Main({ prefix = "" }): JSX.Element {
  const [entries, setEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState("");

  useEffect((): void => {
    gopass
      .list({ limit: searchText ? -1 : 0, prefix, directoriesFirst: true, stripPrefix: true })
      .then((data) => data.filter((item) => item.toLowerCase().includes(searchText.toLowerCase())))
      .then(setEntries)
      .catch(async (error) => {
        console.error(error);
        await showToast({ title: "Could not load passwords", style: Toast.Style.Failure });
      })
      .finally(() => setLoading(false));
  }, [searchText]);

  return (
    <List isLoading={loading} enableFiltering={false} onSearchTextChange={setSearchText}>
      <List.Section title={searchText ? "Results" : "/" + prefix} subtitle={searchText && String(entries.length)}>
        {entries.map((entry, i) => {
          const fullPath = prefix + entry;

          return (
            <List.Item
              key={i}
              title={entry}
              icon={getIcon(entry)}
              accessories={[{ icon: Icon.ChevronRight }]}
              actions={
                <ActionPanel>
                  <Action.Push title="Show Details" icon={getIcon(entry)} target={getTarget(fullPath)} />
                  {!isDirectory(entry) && passwordActions(fullPath)}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
