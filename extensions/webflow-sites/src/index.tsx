import {
  Action,
  ActionPanel,
  Grid,
  Detail,
  showHUD,
  showToast,
  Toast,
  Icon,
  openExtensionPreferences,
  Keyboard,
} from "@raycast/api";

import { getFavicon, useCachedPromise, withAccessToken } from "@raycast/utils";
import { getWebflowClient, provider } from "./oauth";
import { Site } from "webflow-api/api";
import { onError } from "./utils";
import Assets from "./components/assets";

export default withAccessToken(provider)(Command);

function Command() {
  const webflow = getWebflowClient();
  const { isLoading, data, error } = useCachedPromise(
    async () => {
      const result = await webflow.sites.list();
      const sorted = sortByLastPublished(result.sites ?? []);
      return sorted;
    },
    [],
    {
      async onWillExecute() {
        await showToast({ title: "Fetching", message: "Loading", style: Toast.Style.Animated });
      },
      async onData(data) {
        await showToast({
          title: "Ready",
          message: `${data.length} sites loaded`,
          style: Toast.Style.Success,
        });
      },
      onError,
      initialData: [],
    },
  );

  if (error) {
    const markdown = `**Error**  
    
    ${error.message}`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Grid isLoading={isLoading} fit={Grid.Fit.Fill} aspectRatio={"16/9"} searchBarPlaceholder="Search site">
      <Grid.EmptyView
        icon="webflow-128x128.png"
        title="No Results"
        description="Ensure the token can access all sites or check API key"
      />
      <Grid.Section columns={4} title="Recently Published">
        {data.slice(0, 8).map((site) => returnItem(site))}
      </Grid.Section>
      {returnSection(data)}
    </Grid>
  );
}

function returnItem(site: Site) {
  return (
    <Grid.Item
      key={site.id}
      title={site.displayName}
      content={site.previewUrl || "site-empty-thumbnail.svg"}
      subtitle={site.shortName}
      keywords={[`${site.shortName}`]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={{ source: "wf-logo-circle.svg" }}
            title="Open in Webflow Designer"
            url={`https://webflow.com/design/${site.shortName}`}
            onOpen={() => showHUD(`Opened ${site.displayName} in Designer`)}
          />
          <Action.OpenInBrowser
            icon={getFavicon(`https://${site.shortName}.webflow.io`, { fallback: Icon.Globe })}
            title={`Open Site in Browser`}
            url={`https://${site.shortName}.webflow.io`}
            onOpen={() => showHUD(`Opened ${site.displayName} in Browser`)}
          />
          <Action.OpenInBrowser
            icon={Icon.Cog}
            title="Open Site Settings"
            url={`https://webflow.com/dashboard/sites/${site.shortName}`}
            shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
          />
          <Action.Push icon={Icon.Image} title="View Site Assets" target={<Assets siteId={site.id} />} />
          <ActionPanel.Section title="General">
            <Action.OpenInBrowser
              icon={{ source: "wf-logo-circle.svg" }}
              title="Create New Site"
              url={`https://webflow.com/dashboard/sites/new`}
              shortcut={Keyboard.Shortcut.Common.New}
            />
            <Action.OpenInBrowser
              icon={{ source: "wf-logo-circle.svg" }}
              title="Open Webflow Showcase"
              url={`https://webflow.com/made-in-webflow/popular`}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Account">
            <Action.OpenInBrowser
              icon={{ source: "wf-logo-circle.svg" }}
              title="Webflow Account Settings"
              url={`https://webflow.com/dashboard/account/general`}
            />
            <Action
              icon={{ source: "wf-logo-circle.svg" }}
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Change API Token"
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function returnSection(data: Site[]) {
  if (data.length > 8) {
    return (
      <Grid.Section columns={5} title="All Sites">
        {data.slice(8).map((site) => returnItem(site))}
      </Grid.Section>
    );
  }
}

function sortByLastPublished(data: Site[]) {
  return data.sort((a, b) => {
    if (a.lastPublished && b.lastPublished) {
      return new Date(b.lastPublished).getTime() - new Date(a.lastPublished).getTime();
    } else if (a.lastPublished) {
      return -1;
    } else if (b.lastPublished) {
      return 1;
    } else {
      return 0;
    }
  });
}
