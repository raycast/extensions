import {
  Action,
  ActionPanel,
  Grid,
  Detail,
  showHUD,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
  environment,
  Keyboard,
} from "@raycast/api";

import { pathToFileURL } from "url";
import { getFavicon, useFetch } from "@raycast/utils";

const imageApiError = pathToFileURL(`${environment.assetsPath}/peeks-api-incorrect.png`).href;

type SiteV1 = {
  _id: string;
  createdOn: string;
  name: string;
  shortName: string;
  timezone: string;
  lastPublished?: string;
  previewUrl?: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data, error } = useFetch("https://api.webflow.com/sites", {
    method: "GET",
    headers: {
      "Accept-Version": "1.0.0",
      Authorization: `Bearer ${preferences.webflowToken}`,
    },
    async onWillExecute() {
      await showToast({ title: "Fetching", message: "Loading", style: Toast.Style.Animated });
    },
    mapResult(result: SiteV1[]) {
      const sorted = sortByLastPublished(result);
      return {
        data: sorted,
      };
    },
    async onData(data) {
      await showToast({
        title: "Ready",
        message: `${data.length} sites loaded`,
        style: Toast.Style.Success,
      });
    },
    async onError() {
      await showToast({
        title: "Error",
        message: "Check your API token",
        style: Toast.Style.Failure,
      });
    },
    initialData: [],
  });

  if (error) {
    const markdown = `**Weblow API Key Incorrect**  
    Please update it in Settings (see screenshot) and try again. Press _Enter_ to open. 
    ![Image Title](${imageApiError})
    
    Still having issues contact us at raycast@peeks.co`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
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

function returnItem(site: SiteV1) {
  return (
    <Grid.Item
      key={site._id}
      title={site.name}
      content={site.previewUrl || "site-empty-thumbnail.svg"}
      subtitle={site.shortName}
      keywords={[site.shortName]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={{ source: "wf-logo-circle.svg" }}
            title="Open in Webflow Designer"
            url={`https://webflow.com/design/${site.shortName}`}
            onOpen={() => showHUD(`Opened ${site.name} in Designer`)}
          />
          <Action.OpenInBrowser
            icon={getFavicon(`https://${site.shortName}.webflow.io`, { fallback: Icon.Globe })}
            title={`Open Site in Browser`}
            url={`https://${site.shortName}.webflow.io`}
            onOpen={() => showHUD(`Opened ${site.name} in Browser`)}
          />
          <Action.OpenInBrowser
            icon={Icon.Cog}
            title="Open Site Settings"
            url={`https://webflow.com/dashboard/sites/${site.shortName}`}
            shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
          />
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
              title="Change Api Token"
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function returnSection(data: SiteV1[]) {
  if (data.length > 8) {
    return (
      <Grid.Section columns={5} title="All Sites">
        {data.slice(8).map((site: SiteV1) => returnItem(site))}
      </Grid.Section>
    );
  }
}

function sortByLastPublished(data: SiteV1[]) {
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
