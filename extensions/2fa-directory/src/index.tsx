import { List, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface SiteDetails {
  domain: string;
  url?: string;
  tfa?: string[];
  keywords: string[];
  regions?: string[];
  documentation?: string;
  recovery?: string;
}

interface Site {
  [key: string]: SiteDetails;
}

export default function Command() {
  const { isLoading, data } = useFetch<Site[]>("https://api.2fa.directory/v3/all.json");

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data?.map((site: Site, index: number) => {
        return (
          <List.Item
            key={index}
            title={site[1].domain}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={site[1].domain} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={`${site[0]}`} />
                    {site[1].url && (
                      <List.Item.Detail.Metadata.Link title="URL" target={site[1].url} text={site[1].url} />
                    )}
                    {site[1].documentation && (
                      <List.Item.Detail.Metadata.Link
                        title="Documentation"
                        target={site[1].documentation}
                        text="Open URL"
                      />
                    )}
                    {site[1].recovery && (
                      <List.Item.Detail.Metadata.Link title="Recovery" target={site[1].recovery} text="Open URL" />
                    )}
                    <List.Item.Detail.Metadata.Label title="Keywords" text={`${site[1].keywords.join(", ")}`} />
                    {site[1].tfa && (
                      <List.Item.Detail.Metadata.Label title="TFA" text={`${site[1].tfa.join(", ") ?? "-"}`} />
                    )}
                    {site[1].regions && (
                      <List.Item.Detail.Metadata.Label title="Regions" text={`${site[1].regions.join(", ") ?? "-"}`} />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
