import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { useServers } from "./lib/servers";
import useOrgPicker from "./components/org-picker";
import { ottomaticBaseUrl } from "./lib/constants";

export default function Command() {
  const { OrgPicker, selectedOrg, membership } = useOrgPicker();
  const { data, isLoading } = useServers();
  const servers = data?.filter((server) => {
    if (selectedOrg === "") return true;
    return server.org_id === parseInt(selectedOrg);
  });

  const currentOrgSlug = membership?.organization.slug;

  return (
    <List isLoading={isLoading} searchBarAccessory={OrgPicker}>
      {servers?.map((server) => {
        return (
          <List.Item
            key={server.id}
            title={server.name_friendly ?? ""}
            subtitle={server.url ?? ""}
            icon={{
              source: server.isOttomatic ? "ottomatic-icon.png" : "server.svg",
              tintColor: server.metadata.ottoThemeColor
                ? { light: server.metadata.ottoThemeColor, dark: server.metadata.ottoThemeColor, adjustContrast: false }
                : undefined,
            }}
            actions={
              <ActionPanel>
                {server.org_slug && (
                  <Action.OpenInBrowser
                    title="Open in Cloud Console"
                    url={`${ottomaticBaseUrl}/servers/${server.org_slug}/${server.id}`}
                  />
                )}
                {/* <Action title="Refresh Server Info" icon={Icon.RotateClockwise} /> */}
                <Action.CopyToClipboard title="Copy Server URL" content={server.url} />
                <Action.OpenInBrowser title="Launch FMS Admin Console" url={`${server.url}/admin-console`} />
                <Action.OpenInBrowser title="Launch Otto Web Console" url={`${server.url}/otto/`} />
                {server.org_slug && (
                  <Action.OpenInBrowser
                    title="View Hosted Files"
                    url={`${ottomaticBaseUrl}/servers/${server.org_slug}/${server.id}/files`}
                  />
                )}
                {server.org_slug && (
                  <Action.OpenInBrowser
                    title="View Clients"
                    url={`${ottomaticBaseUrl}/servers/${currentOrgSlug}/${server.id}/clients`}
                  />
                )}
              </ActionPanel>
            }
            accessories={[
              ...(server.metadata.ottoServerTag
                ? [
                    {
                      tag: server.metadata.ottoServerTag.toUpperCase(),
                      tooltip: "Environment",
                      icon: {
                        source: Icon.CircleFilled,
                        tintColor:
                          server.metadata.ottoServerTag === "prod"
                            ? Color.Red
                            : server.metadata.ottoServerTag === "dev"
                              ? Color.Green
                              : server.metadata.ottoServerTag === "stg"
                                ? Color.Yellow
                                : undefined,
                      },
                    },
                  ]
                : []),
              {
                icon:
                  server.os === "mac"
                    ? "brand-apple.svg"
                    : server.os === "linux"
                      ? "brand-ubuntu.svg"
                      : server.os === "windows"
                        ? "brand-windows.svg"
                        : undefined,
              },
              { text: server.fms_version, icon: { source: "claris.svg", tintColor: Color.PrimaryText } },
              { text: server.otto_version, icon: { source: "ottofms-icon.svg" } },
            ]}
          />
        );
      })}
    </List>
  );
}
