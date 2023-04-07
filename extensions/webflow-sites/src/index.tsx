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
  openCommandPreferences,
  environment,
} from "@raycast/api";

import { pathToFileURL } from "url";
import { useFetch } from "@raycast/utils";

const imageApiError = pathToFileURL(`${environment.assetsPath}/peeks-api-incorrect.png`).href;

export default function Command() {
  const preferences = getPreferenceValues();

  const headers = {
    method: "GET",
    headers: {
      "Accept-Version": "1.0.0",
      Authorization: `Bearer ${preferences.webflowToken}`,
    },
  };

  const { isLoading, data } = useFetch("https://api.webflow.com/sites", headers);

  if (data) {
    showToast({
      title: "Ready",
      message: `${Object.values(data)?.length} sites loaded`,
      style: Toast.Style.Success,
    });
  } else if (isLoading) {
    showToast({ title: "Fetching", message: "Loading", style: Toast.Style.Animated });
  } else if (!data) {
    showToast({
      title: "Error",
      message: "Check your API token",
      style: Toast.Style.Failure,
    });

    const markdown = `**Weblow API Key Incorrect**  
    Please update it in Settings (see screenshot) and try again. Press _Enter_ to open. 
    ![Image Title](${imageApiError})
    
    Still having issues contact us at raycast@peeks.co`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openCommandPreferences} />
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
        {sortByLastPublished(data)
          ?.slice(0, 8)
          .map((site: any) => returnItem(site))}
      </Grid.Section>
      {returnSection(data)}
    </Grid>
  );
}

function returnItem(site: any) {
  return (
    <Grid.Item
      key={site?._id}
      title={site?.name}
      content={site?.previewUrl || "site-empty-thumbnail.svg"}
      subtitle={site?.shortName}
      keywords={[site?.shortName]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={{ source: "wf-logo-circle.svg" }}
            title="Open in Webflow Designer"
            url={`https://webflow.com/design/${site?.shortName}`}
            onOpen={() => showHUD(`Opened ${site?.name} in Designer`)}
          />
          <Action.OpenInBrowser
            icon={{
              source: `https://icons.duckduckgo.com/ip3/${site?.shortName}.webflow.io.ico`,
              fallback: Icon.Globe,
            }}
            title={`Open Site in Browser`}
            url={`https://${site?.shortName}.webflow.io`}
            onOpen={() => showHUD(`Opened ${site?.name} in Browser`)}
          />
          <Action.OpenInBrowser
            icon={Icon.Cog}
            title="Open Site Settings"
            url={`https://webflow.com/dashboard/sites/${site?.shortName}`}
            shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
          />
          <ActionPanel.Section title="General">
            <Action.OpenInBrowser
              icon={{ source: "wf-logo-circle.svg" }}
              title="Create New Site"
              url={`https://webflow.com/dashboard/sites/new`}
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
              title="Change API Token"
              onAction={() => {
                openCommandPreferences();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function returnSection(data: any) {
  if (data?.length > 8) {
    return (
      <Grid.Section columns={5} title="All Sites">
        {sortByLastPublished(data)
          ?.slice(8)
          .map((site: any) => returnItem(site))}
      </Grid.Section>
    );
  }
}

function sortByLastPublished(data: any) {
  return data?.sort((a: any, b: any) => {
    if (a?.lastPublished && b?.lastPublished) {
      return new Date(b.lastPublished).getTime() - new Date(a.lastPublished).getTime();
    } else if (a?.lastPublished) {
      return -1;
    } else if (b?.lastPublished) {
      return 1;
    } else {
      return 0;
    }
  });
}
