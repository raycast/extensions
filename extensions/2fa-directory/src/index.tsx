import { List, Action, ActionPanel, environment, Color } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { useState } from "react";

interface SiteDetails {
  domain: string;
  "additional-domains"?: string[];
  "custom-software"?: string[];
  url?: string;
  tfa?: string[];
  keywords: string[];
  regions?: string[];
  documentation?: string;
  recovery?: string;
  notes?: string;
  contact?: {
    email?: string;
    facebook?: string;
    twitter?: string;
    language?: string;
    form?: string;
  };
}

interface Site extends Array<string | SiteDetails> {
  0: string;
  1: SiteDetails;
}

export default function Command() {
  const [category, setCategory] = useState("all");
  const { isLoading, data } = useFetch<Site[]>("https://api.2fa.directory/v3/all.json", {
    keepPreviousData: true,
  });

  const categories = {
    all: "All",
    backup: "Backup and Sync",
    banking: "Banking",
    betting: "Betting",
    cloud: "Cloud Computing",
    communication: "Communication",
    creativity: "Creativity",
    crowdfunding: "Crowdfunding",
    cryptocurrencies: "Cryptocurrencies",
    developer: "Developer",
    domains: "Domains",
    education: "Education",
    email: "Email",
    entertainment: "Entertainment",
    finance: "Finance",
    food: "Food",
    gaming: "Gaming",
    government: "Government",
    health: "Health",
    hosting: "Hosting/VPS",
    identity: "Identity Management",
    insurance: "Insurance",
    investing: "Investing",
    iot: "IoT",
    legal: "Legal & Compliance",
    marketing: "Marketing & Analytics",
    payments: "Payments",
    post: "Post and Shipping",
    remote: "Remote Access",
    retail: "Retail",
    security: "Security",
    social: "Social",
    task: "Task Management",
    tickets: "Tickets and Events",
    transport: "Transport",
    travel: "Travel and Accommodations",
    universities: "Universities",
    utilities: "Utilities",
    vpn: "VPN",
    other: "Other",
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search websites"
      searchBarAccessory={
        <List.Dropdown tooltip="Category" onChange={setCategory}>
          {Object.entries(categories).map(([cat, title]) => (
            <List.Dropdown.Item
              key={cat}
              icon={{
                source: `${cat}.png`,
                tintColor: environment.appearance === "light" ? Color.PrimaryText : undefined,
              }}
              title={title}
              value={cat}
            />
          ))}
        </List.Dropdown>
      }
    >
      {data && (
        <List.Section title={`${data.length} websites`}>
          {data
            .filter((site) => category === "all" || site[1].keywords.includes(category))
            .map((site: Site, index: number) => {
              const url = `https://${site[1].domain}`;
              return (
                <List.Item
                  key={index}
                  icon={getFavicon(url)}
                  title={site[1].domain}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open in Browser" url={url} />
                    </ActionPanel>
                  }
                  detail={
                    <List.Item.Detail
                      markdown={site[1].notes}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Name" text={site[0]} />
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
                            <List.Item.Detail.Metadata.Link
                              title="Recovery"
                              target={site[1].recovery}
                              text="Open URL"
                            />
                          )}
                          <List.Item.Detail.Metadata.Label title="Keywords" text={site[1].keywords.join(", ")} />
                          {site[1].tfa && <List.Item.Detail.Metadata.Label title="TFA" text={site[1].tfa.join(", ")} />}
                          {site[1].regions && (
                            <List.Item.Detail.Metadata.Label title="Regions" text={site[1].regions.join(", ")} />
                          )}
                          {site[1]["additional-domains"] && (
                            <List.Item.Detail.Metadata.Label
                              title="Additional Domains"
                              text={site[1]["additional-domains"].join(", ")}
                            />
                          )}
                          {site[1]["custom-software"] && (
                            <List.Item.Detail.Metadata.Label
                              title="Custom Software"
                              text={site[1]["custom-software"].join(", ")}
                            />
                          )}
                          {site[1].contact && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label title="Contact" />
                              {site[1].contact.email && (
                                <List.Item.Detail.Metadata.Link
                                  title="Email"
                                  text={site[1].contact.email}
                                  target={`mailto:${site[1].contact.email}`}
                                />
                              )}
                              {site[1].contact.facebook && (
                                <List.Item.Detail.Metadata.Link
                                  title="Facebook"
                                  text={site[1].contact.facebook}
                                  target={`https://facebook.com/${site[1].contact.facebook}`}
                                />
                              )}
                              {site[1].contact.twitter && (
                                <List.Item.Detail.Metadata.Link
                                  title="Twitter/X"
                                  text={site[1].contact.twitter}
                                  target={`https://x.com/${site[1].contact.twitter}`}
                                />
                              )}
                              {site[1].contact.language && (
                                <List.Item.Detail.Metadata.Label title="Language" text={site[1].contact.language} />
                              )}
                              {site[1].contact.form && (
                                <List.Item.Detail.Metadata.Link
                                  title="Form"
                                  text={site[1].contact.form}
                                  target={site[1].contact.form}
                                />
                              )}
                            </>
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                />
              );
            })}
        </List.Section>
      )}
    </List>
  );
}
