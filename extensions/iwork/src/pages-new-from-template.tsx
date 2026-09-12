import { useEffect, useState } from "react";
import { showHUD, ActionPanel, List, Action, popToRoot } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkPagesInstalled } from "./index";

export default function Main() {
  const [templates, setTemplates] = useState<string[]>([] as string[]);

  // Check for Pages app
  Promise.resolve(checkPagesInstalled()).then((installed) => {
    if (!installed) {
      popToRoot();
    }
  });

  useEffect(() => {
    Promise.resolve(runAppleScript('tell application "Pages" to return name of every template')).then(
      (templateString) => {
        setTemplates(templateString.split(", "));
      }
    );
  }, []);

  if (!templates?.length) {
    return <List isLoading={!templates?.length} searchBarPlaceholder="Search templates..."></List>;
  }

  return (
    <List searchBarPlaceholder="Search templates...">
      {templates.map((template) => {
        const title = `${template} Template`;
        return (
          <List.Item
            title={title}
            key={template}
            actions={
              <ActionPanel>
                <Action title={title} onAction={() => makeDocument(template)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

async function makeDocument(templateName: string) {
  showHUD(`Creating new Pages document with ${templateName} template...`);
  await runAppleScript(`tell application "Pages"
    set theTemplate to the template named "${templateName}"
    make new document with properties {document template: theTemplate}
    activate
  end tell`);
}
