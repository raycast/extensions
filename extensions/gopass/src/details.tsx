import { Action, ActionPanel, Clipboard, closeMainWindow, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import gopass from "./gopass";
import { capitalize } from "./utils";
import { copyPassword, pastePassword } from "./index";

async function copy(key: string, value: string): Promise<void> {
  Clipboard.copy(value);
  await closeMainWindow();
  await showHUD(`${key} copied`);
}

async function paste(key: string, value: string): Promise<void> {
  await showHUD(`${key} pasted`);
  await Clipboard.paste(value);
  await closeMainWindow();
}

export default function ({ entry }: { entry: string }): JSX.Element {
  const [details, setDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect((): void => {
    gopass
      .show(entry)
      .then((data) => ["password: *****************"].concat(data))
      .then(setDetails)
      .catch(async (error) => {
        console.error(error);
        await showToast({ title: "Could not load passwords", style: Toast.Style.Failure });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <List isLoading={loading}>
      {details.map((item, index) => {
        const [key, value] = item.split(": ");
        const copyAction = () => (index === 0 ? copyPassword(entry) : copy(key, value));
        const pasteAction = () => (index === 0 ? pastePassword(entry) : paste(key, value));

        return (
          <List.Item
            key={index}
            title={capitalize(key)}
            subtitle={value}
            actions={
              <ActionPanel>
                <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={copyAction} />
                <Action title="Paste to Active App" icon={Icon.Document} onAction={pasteAction} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
