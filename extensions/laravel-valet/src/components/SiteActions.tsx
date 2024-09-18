import { MutatePromise } from "@raycast/utils";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { Site } from "../types/entities";
import { secureSite, unsecureSite } from "../helpers/commands";

interface SiteActionsProps {
  site: Site;
  mutateSites?: MutatePromise<Site[] | undefined>;
}

export default function SiteActions({ site, mutateSites }: SiteActionsProps): JSX.Element {
  return (
    <>
      <Action.OpenInBrowser url={site.url} icon={Icon.Globe} />
      <ActionPanel.Section title={`Site actions (${site.secured ? "secured" : "unsecured"})`}>
        {site.secured ? (
          <Action
            title="Unsecure Site"
            icon={{ source: Icon.LockUnlocked, tintColor: Color.Red }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            onAction={() => unsecureSite(site, mutateSites)}
          />
        ) : (
          <Action
            title="Secure Site"
            icon={{ source: Icon.Lock, tintColor: Color.Green }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            onAction={() => secureSite(site, mutateSites)}
          />
        )}
        <Action.ShowInFinder path={site.path} />
        <Action.OpenWith path={site.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        <Action.CopyToClipboard
          title="Copy Site Path"
          content={site.path}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
        />
      </ActionPanel.Section>
    </>
  );
}
