import { Action, ActionPanel, Clipboard, closeMainWindow, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import gopass from "./gopass";
import { humanize, isValidUrl } from "./utils";
import { copyPassword, pastePassword } from "./index";

async function copy(key: string, value: string): Promise<void> {
  await Clipboard.copy(value);
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
      .then(setDetails)
      .catch(async (error) => {
        console.error(error);
        await showToast({ title: "Could not load passwords", style: Toast.Style.Failure });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <List isLoading={loading}>
      <List.Section title={"/" + entry}>
        {!loading && (
          <List.Item
            title="Password"
            subtitle="*****************"
            actions={
              <ActionPanel>
                <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => copyPassword(entry)} />
                <Action title="Paste to Active App" icon={Icon.Document} onAction={() => pastePassword(entry)} />
              </ActionPanel>
            }
          />
        )}

        {details.map((item, index) => {
          const [key, ...values] = item.split(": ");
          const value = values.join(": ");

          return (
            <List.Item
              key={index}
              title={humanize(key)}
              subtitle={value}
              actions={
                <ActionPanel>
                  {isValidUrl(value) && <Action.OpenInBrowser url={value} />}
                  <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => copy(key, value)} />
                  <Action title="Paste to Active App" icon={Icon.Document} onAction={() => paste(key, value)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
