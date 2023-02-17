import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { secureSite, site, unsecureSite } from "../utils";

interface SiteProps {
  site: site;
}

export function Site({ site: site }: SiteProps): JSX.Element {
  return (
    <List.Item
      title={{ value: site.url.replace(site.secured ? "https://" : "http://", ""), tooltip: site.url }}
      subtitle={site.prettyPath}
      icon={Icon.Folder}
      accessories={[
        {
          icon: site.secured ? Icon.Lock : "",
          tag: site.secured ? { color: Color.Green, value: "Secured" } : "",
          tooltip: site.secured ? "Site is secured using the `valet secure` command" : "",
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={site.url} icon={Icon.Globe} />
          <ActionPanel.Section title={"Valet actions"}>
            <Action
              title="Secure Site"
              icon={{ source: Icon.Lock, tintColor: Color.Green }}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => secureSite(site)}
            />
            <Action
              title="Unsecure Site"
              icon={{ source: Icon.LockUnlocked, tintColor: Color.Red }}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              onAction={() => unsecureSite(site)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={"Default actions"}>
            <Action.ShowInFinder path={site.path} />
            <Action.OpenWith path={site.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action.CopyToClipboard
              title="Copy Site Path"
              content={site.path}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
