import { MutatePromise } from "@raycast/utils";
import { executeCommand, getConfig, handleError } from "../helpers/general";
import { Action, ActionPanel, Color, Icon, showToast, Toast } from "@raycast/api";
import { Site } from "../types/entities";

interface SiteActionsProps {
  site: Site;
  mutateSites?: MutatePromise<Site[] | undefined>;
}

export default function SiteActions({ site, mutateSites }: SiteActionsProps): JSX.Element {
  async function mutate() {
    if (mutateSites) {
      await mutateSites();
    }
  }

  async function secureSite(site: Site) {
    await showToast({ style: Toast.Style.Animated, title: `Securing site [${site.name}.${getConfig().tld}]` });

    try {
      await executeCommand(`valet secure ${site.name}`);
      await showToast({
        style: Toast.Style.Success,
        title: `The [${site.name}.${getConfig().tld}] site has been secured`,
      });

      await mutate();
    } catch (error) {
      await handleError({ error, title: "Unable to secure site" });
    }
  }

  async function unsecureSite(site: Site) {
    await showToast({ style: Toast.Style.Animated, title: `Unsecure site [${site.name}.${getConfig().tld}]` });

    try {
      await executeCommand(`valet unsecure ${site.name}`);
      await showToast({
        style: Toast.Style.Success,
        title: `The [${site.name}.${getConfig().tld}] site will now serve traffic over HTTP`,
      });

      await mutate();
    } catch (error) {
      await handleError({ error, title: "Unable to unsecure site" });
    }
  }

  return (
    <>
      <Action.OpenInBrowser url={site.url} icon={Icon.Globe} />

      <ActionPanel.Section title={"Valet actions"}>
        <Action
          title="Secure Site"
          icon={{ source: Icon.Lock, tintColor: Color.Green }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={() => secureSite(site)}
        />
        <Action
          title="Unsecure Site"
          icon={{ source: Icon.LockUnlocked, tintColor: Color.Red }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
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
    </>
  );
}
