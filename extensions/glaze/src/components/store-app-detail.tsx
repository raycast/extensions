import { GlazeAction } from "./glaze-action";
import { ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { StoreApp } from "../lib/types";
import { launchApp, openStorePage, openProfile } from "../lib/deeplinks";
import { getStoreInstalledApps } from "../lib/apps";
import { STORE_CATEGORIES } from "../lib/store-filters";

function markdownText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/([\\`*_[\]<>])/g, "\\$1");
}

export function StoreAppDetail({ app }: { app: StoreApp }) {
  const {
    data: installedApps,
    isLoading,
    error: installationError,
    revalidate,
  } = usePromise(getStoreInstalledApps);
  const installedApp = installationError
    ? undefined
    : installedApps?.find((installed) => installed.storeAppId === app.id);
  const bundlePath = installedApp?.bundlePath;
  const category = STORE_CATEGORIES.find(
    (category) => category.value === app.category && category.value !== "",
  );
  let icon = "extension-icon.png?raycast-width=64&raycast-height=64";
  if (app.icon_url) {
    try {
      const url = new URL(app.icon_url);
      if (url.protocol === "https:" || url.protocol === "http:") {
        url.searchParams.set("raycast-width", "64");
        url.searchParams.set("raycast-height", "64");
        icon = url.toString();
      }
    } catch {
      // Keep the bundled icon if the store's URL is malformed.
    }
  }
  // A multiline Setext heading keeps the icon left-aligned above the title.
  // A standalone image is centered; an inline image in an ATX (#) heading
  // leaks its raw Markdown into Raycast's scrolling navigation title.
  const markdown = [
    `![App icon](<${icon}>)  \n${markdownText(app.display_name)}\n===`,
    app.full_description || app.description || "No description available.",
  ].join("\n\n");

  return (
    <Detail
      navigationTitle={app.display_name}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {installedApp && (
            <Detail.Metadata.Label
              title="Status"
              text={{ value: "Installed", color: Color.Green }}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            />
          )}
          {installationError && (
            <Detail.Metadata.Label
              title="Status"
              text="Unable to check installation"
              icon={Icon.ExclamationMark}
            />
          )}
          <Detail.Metadata.Label
            title="Author"
            text={
              app.profiles?.display_name || app.profiles?.username || "Unknown"
            }
          />
          {app.latest_version && (
            <Detail.Metadata.Label title="Version" text={app.latest_version} />
          )}
          {category && (
            <Detail.Metadata.TagList title="Category">
              <Detail.Metadata.TagList.Item
                text={category.title}
                icon={category.icon}
              />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {bundlePath && (
            <GlazeAction
              title="Open App"
              icon={Icon.AppWindow}
              onAction={() => launchApp(bundlePath)}
            />
          )}
          <GlazeAction
            title={installedApp ? "View in Glaze" : "View and Install in Glaze"}
            icon={installedApp ? Icon.Globe : Icon.Download}
            onAction={() => openStorePage(app.id)}
          />
          {app.profiles?.username && (
            <GlazeAction
              title="View Author"
              onAction={() => openProfile(app.profiles!.username)}
            />
          )}
          <GlazeAction
            title="Refresh Installation Status"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              await revalidate();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
