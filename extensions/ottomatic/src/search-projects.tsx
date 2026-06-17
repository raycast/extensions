import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { useServers } from "./lib/servers";
import useOrgPicker from "./components/org-picker";
import { ottomaticBaseUrl } from "./lib/constants";

export default function Command() {
  const { OrgPicker, membership } = useOrgPicker();
  const { data: servers, isLoading } = useServers();

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
                <Action.OpenInBrowser
                  title="Open in Cloud Console"
                  url={`${ottomaticBaseUrl}/${currentOrgSlug}/servers/${server.id}`}
                />
                <Action title="Refresh Server Info" />
                <Action.CopyToClipboard title="Copy Server URL" content={server.url} />
                <Action.OpenInBrowser title="Launch FMS Admin Console" url={`${server.url}/admin-console`} />
                <Action.OpenInBrowser title="Launch Otto Web Console" url={`${server.url}/otto/`} />
                <Action.Push title="View Hosted Files" target={<></>} />
                <Action.Push title="View Clients" target={<></>} />
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
