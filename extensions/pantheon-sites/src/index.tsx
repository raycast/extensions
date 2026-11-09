import { ActionPanel, List, Action, Icon, Color, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState } from "react";
import { terminusCmd } from "./utils";
import { Sites } from "./types";
import { TerminusSetup } from "./components/TerminusSetup";
import { SiteDetail } from "./components/SiteDetail";

function getMemberships(site: Sites[string]): string[] {
  if (!site.memberships) return [];
  return site.memberships
    .split(",")
    .map((m) => m.split(":")[1]?.trim())
    .filter(Boolean);
}

// framework can be null (uninitialized site), a variant like "drupal10" / "wordpress_network",
// or a framework without a bundled icon (e.g. "nodejs", "backdrop").
function frameworkIcon(framework: string | null) {
  if (framework === null) return { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText };
  if (framework.startsWith("wordpress")) return { source: "wordpress.svg", tintColor: Color.PrimaryText };
  if (framework.startsWith("drupal")) return { source: "drupal.svg", tintColor: Color.PrimaryText };
  return { source: Icon.Code, tintColor: Color.PrimaryText };
}

function getOrgLabel(orgName: string): string {
  return orgName.toLowerCase() === "team" ? "Personal" : orgName;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedOrg, setSelectedOrg] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [refreshStamps, setRefreshStamps] = useState<Record<string, number>>({});

  const { isLoading: checkLoading, error: checkError } = useExec(terminusCmd(preferences.terminusPath, "--version"), {
    shell: true,
  });

  const { isLoading: sitesLoading, data } = useExec(terminusCmd(preferences.terminusPath, "site:list --format=json"), {
    shell: true,
    execute: !checkLoading && !checkError,
  });

  const isLoading = checkLoading || sitesLoading;

  if (!checkLoading && checkError) {
    return <TerminusSetup />;
  }

  let sites: Sites = {};
  if (data) {
    try {
      sites = JSON.parse(data);
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to parse site list",
        message: "Unexpected Terminus output",
      });
    }
  }

  const allOrgs = Array.from(new Set(Object.values(sites).flatMap((site) => getMemberships(site)))).sort((a, b) => {
    if (a.toLowerCase() === "team") return -1;
    if (b.toLowerCase() === "team") return 1;
    return a.localeCompare(b);
  });

  const filteredSiteKeys = Object.keys(sites)
    .filter((key) => {
      if (selectedOrg !== "all" && !getMemberships(sites[key]).includes(selectedOrg)) return false;
      if (selectedStatus === "active") return !sites[key].frozen;
      if (selectedStatus === "frozen") return sites[key].frozen;
      return true;
    })
    .sort((a, b) => sites[a].name.localeCompare(sites[b].name));

  const dashboardUrl = "https://dashboard.pantheon.io";

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      navigationTitle="Search Sites"
      searchBarPlaceholder="Search sites"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Sites"
          storeValue={true}
          onChange={(value) => {
            const [type, val] = value.split(":");
            if (type === "org") setSelectedOrg(val);
            if (type === "status") setSelectedStatus(val);
          }}
        >
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="All Statuses" value="status:all" />
            <List.Dropdown.Item title="Active" value="status:active" />
            <List.Dropdown.Item title="Frozen" value="status:frozen" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Organization">
            <List.Dropdown.Item title="All Organizations" value="org:all" />
            {allOrgs.map((org) => (
              <List.Dropdown.Item key={org} title={getOrgLabel(org)} value={`org:${org}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {sites && (
        <List.Section title="Sites" subtitle={`${filteredSiteKeys.length}`}>
          {filteredSiteKeys.map((key) => {
            const siteUrl = `https://live-${sites[key].name}.pantheonsite.io/`;
            const stamp = refreshStamps[key];
            const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(
              siteUrl,
            )}&screenshot=true&meta=false&embed=screenshot.url${stamp ? `&force=true&_=${stamp}` : ""}`;
            const markdown = preferences.showScreenshots && !sites[key].frozen ? `![screenshot](${screenshotUrl})` : "";

            return (
              <List.Item
                icon={frameworkIcon(sites[key].framework)}
                title={sites[key].name}
                key={sites[key].id}
                accessories={[
                  {
                    icon: {
                      source: sites[key].frozen ? Icon.Snowflake : Icon.CircleFilled,
                      tintColor: sites[key].frozen ? Color.Blue : Color.Green,
                    },
                  },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={markdown}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Status">
                          {sites[key].frozen && (
                            <List.Item.Detail.Metadata.TagList.Item text="Frozen" icon={undefined} color={"#357fee"} />
                          )}
                          {!sites[key].frozen && (
                            <List.Item.Detail.Metadata.TagList.Item text="Active" icon={undefined} color={"#43bb53"} />
                          )}
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="Plan" text={`${sites[key].plan_name}`} />
                        <List.Item.Detail.Metadata.Label title="Region" text={`${sites[key].region}`} />
                        <List.Item.Detail.Metadata.Label
                          title="Created"
                          text={`${new Date(sites[key].created * 1000).toLocaleDateString()}`}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Framework"
                          icon={frameworkIcon(sites[key].framework)}
                          text={sites[key].framework ?? "Not initialized"}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Environments"
                      target={<SiteDetail site={sites[key]} preferences={preferences} />}
                    />
                    <Action.OpenInBrowser
                      icon={Icon.AppWindowList}
                      title="Open Pantheon Dashboard"
                      url={`${dashboardUrl}/sites/${sites[key].id}`}
                    />
                    <Action
                      icon={Icon.ArrowClockwise}
                      title="Refresh Screenshot"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      onAction={() => setRefreshStamps((prev) => ({ ...prev, [key]: Date.now() }))}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
