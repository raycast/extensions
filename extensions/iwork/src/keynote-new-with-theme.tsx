import { useEffect, useState } from "react";
import { showHUD, ActionPanel, List, Action, popToRoot } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkKeynoteInstalled } from "./index";

export default function Main() {
  const [themes, setThemes] = useState<string[]>([] as string[]);

  // Check for Keynote app
  Promise.resolve(checkKeynoteInstalled()).then((installed) => {
    if (!installed) {
      popToRoot();
    }
  });

  useEffect(() => {
    Promise.resolve(runAppleScript('tell application "Keynote" to return name of every theme')).then((themesString) => {
      setThemes(themesString.split(", "));
    });
  }, []);

  if (!themes?.length) {
    return <List isLoading={!themes?.length} searchBarPlaceholder="Search themes..."></List>;
  }

  return (
    <List searchBarPlaceholder="Search themes...">
      {themes.map((theme) => {
        const title = `${theme} Theme`;
        return (
          <List.Item
            title={title}
            key={theme}
            actions={
              <ActionPanel>
                <Action title={title} onAction={() => makeDocument(theme)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

async function makeDocument(themeName: string) {
  showHUD(`Creating new Keynote with ${themeName} theme...`);
  await runAppleScript(`tell application "Keynote"
    set theTheme to the theme named "${themeName}"
    make new document with properties {document theme: theTheme}
    activate
  end tell`);
}
