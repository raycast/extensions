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

export default function Command() {
  const [category, setCategory] = useState("all");
  const { isLoading, data } = useFetch<Site[]>("https://api.2fa.directory/v3/all.json", {
    keepPreviousData: true,
  });

  const sites = !data ? [] : data.filter((site) => category === "all" || site[1].keywords.includes(category));

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
      <List.Section title={`${sites.length} websites`}>
        {sites.map(([name, site]) => {
          const url = `https://${site.domain}`;
          return (
            <List.Item
              key={name}
              icon={getFavicon(url)}
              title={site.domain}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Browser" url={url} />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={site.notes}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={name} />
                      {site.url && <List.Item.Detail.Metadata.Link title="URL" target={site.url} text={site.url} />}
                      {site.documentation && (
                        <List.Item.Detail.Metadata.Link
                          title="Documentation"
                          target={site.documentation}
                          text="Open URL"
                        />
                      )}
                      {site.recovery && (
                        <List.Item.Detail.Metadata.Link title="Recovery" target={site.recovery} text="Open URL" />
                      )}
                      <List.Item.Detail.Metadata.Label title="Keywords" text={site.keywords.join(", ")} />
                      {site.tfa && <List.Item.Detail.Metadata.Label title="TFA" text={site.tfa.join(", ")} />}
                      {site.regions && (
                        <List.Item.Detail.Metadata.Label title="Regions" text={site.regions.join(", ")} />
                      )}
                      {site["additional-domains"] && (
                        <List.Item.Detail.Metadata.Label
                          title="Additional Domains"
                          text={site["additional-domains"].join(", ")}
                        />
                      )}
                      {site["custom-software"] && (
                        <List.Item.Detail.Metadata.Label
                          title="Custom Software"
                          text={site["custom-software"].join(", ")}
                        />
                      )}
                      {site.contact && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Contact" />
                          {site.contact.email && (
                            <List.Item.Detail.Metadata.Link
                              title="Email"
                              text={site.contact.email}
                              target={`mailto:${site.contact.email}`}
                            />
                          )}
                          {site.contact.facebook && (
                            <List.Item.Detail.Metadata.Link
                              title="Facebook"
                              text={site.contact.facebook}
                              target={`https://facebook.com/${site.contact.facebook}`}
                            />
                          )}
                          {site.contact.twitter && (
                            <List.Item.Detail.Metadata.Link
                              title="Twitter/X"
                              text={site.contact.twitter}
                              target={`https://x.com/${site.contact.twitter}`}
                            />
                          )}
                          {site.contact.language && (
                            <List.Item.Detail.Metadata.Label title="Language" text={site.contact.language} />
                          )}
                          {site.contact.form && (
                            <List.Item.Detail.Metadata.Link
                              title="Form"
                              text={site.contact.form}
                              target={site.contact.form}
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
    </List>
  );
}
