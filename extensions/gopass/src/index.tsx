import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  confirmAlert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import gopass from "./gopass";
import Details from "./details";
import { isDirectory, generateOTPFromUrl, extractOtpauthUrls } from "./utils";
import Fuse from "fuse.js";
import CreateEditPassword from "./create-edit";

export async function removePassword(entry: string): Promise<void> {
  try {
    if (
      await confirmAlert({ title: `Confirm you want to delete password "${entry}". This action cannot be undone.` })
    ) {
      const toast = await showToast({ title: `Deleting password "${entry}"...`, style: Toast.Style.Animated });
      await gopass.remove(entry, true);
      await toast.hide();
      await closeMainWindow();
      await showHUD("Password deleted");
    } else {
      await showToast({ title: `Password "${entry}" deletion canceled`, style: Toast.Style.Success });
    }
  } catch (error) {
    console.error(error);
    await showToast({ title: "Could not delete password", style: Toast.Style.Failure });
  }
}

export async function sync(): Promise<void> {
  try {
    const toast = await showToast({ title: "Syncing Passwords", style: Toast.Style.Animated });
    await gopass.sync();
    await toast.hide();
  } catch (error) {
    console.error(error);
    await showToast({ title: "Could not sync password", style: Toast.Style.Failure });
  }
}

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
    
    // First try to get OTP from otpauth:// URLs in the entry details
    try {
      const value = await gopass.show(entry);
      const allLines = [value.password, ...value.attributes];
      const otpauthUrls = extractOtpauthUrls(allLines);
      
      if (otpauthUrls.length > 0) {
        const otp = generateOTPFromUrl(otpauthUrls[0]);
        await Clipboard.copy(otp);
        await toast.hide();
        await closeMainWindow();
        await showHUD("OTP copied");
        return;
      }
    } catch (otpauthError) {
      console.warn("Failed to generate OTP from otpauth:// URL, falling back to gopass otp command:", otpauthError);
    }
    
    // Fallback to gopass otp command
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
    
    // First try to get OTP from otpauth:// URLs in the entry details
    try {
      const value = await gopass.show(entry);
      const allLines = [value.password, ...value.attributes];
      const otpauthUrls = extractOtpauthUrls(allLines);
      
      if (otpauthUrls.length > 0) {
        const otp = generateOTPFromUrl(otpauthUrls[0]);
        await Clipboard.paste(otp);
        await toast.hide();
        await closeMainWindow();
        await showHUD("OTP pasted");
        return;
      }
    } catch (otpauthError) {
      console.warn("Failed to generate OTP from otpauth:// URL, falling back to gopass otp command:", otpauthError);
    }
    
    // Fallback to gopass otp command
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
    <Action.Push title="Edit Password" icon={Icon.EditShape} target={<CreateEditPassword inputPassword={entry} />} />
    <Action title="Delete Password" icon={Icon.DeleteDocument} onAction={() => removePassword(entry)} />
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
      .then((data) =>
        new Fuse(data, { useExtendedSearch: true, keys: ["item"] }).search(searchText).map((item) => item.item)
      )
      .then(setEntries)
      .catch(async (error) => {
        console.error(error);
        await showToast({ title: "Could not load passwords", style: Toast.Style.Failure });
      })
      .finally(() => setLoading(false));
  }, [searchText]);

  return (
    <List
      isLoading={loading}
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Sync Passwords" icon={Icon.Network} onAction={sync} />
          <Action.Push title="New Password" icon={Icon.NewDocument} target={<CreateEditPassword />} />
        </ActionPanel>
      }
    >
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
