import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { site } from "../utils";

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
          tag: site.secured ? { color: Color.Green, value: "secured" } : "",
          tooltip: site.secured ? "Site is secured using the `valet secure` command" : "",
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={site.url} icon={Icon.Globe} />
          <Action.ShowInFinder path={site.path} />
          <Action.OpenWith path={site.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <Action.CopyToClipboard
            title="Copy site Path"
            content={site.path}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
          />
        </ActionPanel>
      }
    />
  );
}
