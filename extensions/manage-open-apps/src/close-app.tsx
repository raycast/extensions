import { showFailureToast, usePromise } from "@raycast/utils";
import { Action, ActionPanel, List, popToRoot } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { closeApplicationAppleScript } from "./lib/apple-scripts";
import { getActiveApplications } from "./lib/active-apps";

export default function CloseSelectedApplication() {
  const { data: activeApplications, isLoading, revalidate } = usePromise(getActiveApplications);

  const handleAppClose = async (appName: string) => {
    try {
      await runAppleScript(closeApplicationAppleScript(appName));
      await revalidate();
    } catch (e) {
      console.log(`handleAppClose -> ${appName} -> ${e}`);
      showFailureToast({ error: `Couldn't close ${appName}` });
      popToRoot();
    }
  };

  return (
    <List searchBarPlaceholder="Search Open Apps" isLoading={isLoading}>
      {activeApplications?.map(({ name, icon }) => (
        <List.Item
          key={name}
          title={name}
          icon={icon}
          actions={
            <ActionPanel>
              <Action title={`Close ${name}`} onAction={() => handleAppClose(name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
