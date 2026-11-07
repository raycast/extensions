import { Action, ActionPanel, Application, getApplications, Icon, List, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { links } from "./parallex";

/** Apps in Applications that Parallex can copy (Apple's own can't be). */
function copyable(app: Application): boolean {
  return (
    !app.bundleId?.startsWith("com.apple.") &&
    !app.path.startsWith("/System/") &&
    !app.bundleId?.startsWith("com.parallex.")
  );
}

export default function NewInstance() {
  const [apps, setApps] = useState<Application[] | null>(null);
  useEffect(() => {
    getApplications().then((all) => setApps(all.filter(copyable).sort((a, b) => a.name.localeCompare(b.name))));
  }, []);
  return (
    <List isLoading={apps === null} searchBarPlaceholder="Which app should have a second copy?">
      {(apps ?? []).map((app) => (
        <List.Item
          key={app.path}
          icon={{ fileIcon: app.path }}
          title={app.name}
          subtitle={app.bundleId}
          actions={
            <ActionPanel>
              <Action
                title={`Make a Second ${app.name}`}
                icon={Icon.PlusSquare}
                onAction={() => open(links.newInstance(app.name))}
              />
              <Action.OpenInBrowser title="How It Goes with This App" url="https://parallex.mandip.dev/apps" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
