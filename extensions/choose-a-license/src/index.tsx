import licenses from "./licenses.json";
import { ActionPanel, List, Action } from "@raycast/api";
import { LicenseDetailView } from "./LicenseDetail";

export default function Command() {
  return (
    <List>
      {licenses.licenses.map((license, index) => (
        <List.Item
          key={index}
          icon="term-sheet.png"
          title={license.name}
          subtitle={license.subtitle}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<LicenseDetailView license={license} />} />
              <Action.OpenInBrowser title="Open in Browser" url={license.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
