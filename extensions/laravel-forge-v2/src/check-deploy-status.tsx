import { Cache, Image, LaunchType, MenuBarExtra, launchCommand, updateCommandMetadata } from "@raycast/api";
import { useAllSites } from "./hooks/useAllSites";
import { ISite } from "./types";
import { runAppleScript } from "run-applescript";
import { useEffect } from "react";

const cache = new Cache();
if (!cache.get("deploying-ids")) {
  cache.set("deploying-ids", JSON.stringify([]));
}
if (!cache.get("deploying-last-status")) {
  cache.set("deploying-last-status", JSON.stringify([]));
}
const recentlyDeployed = () => JSON.parse(cache.get("deploying-ids") ?? "[]");
const lastStatus = () => JSON.parse(cache.get("deploying-last-status") ?? "[]");

interface RecentEntry {
  id: string;
  timestamp: number;
}

// Escape a value for safe interpolation into an AppleScript double-quoted string.
const escapeAppleScript = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

// Sites are merged from two accounts. Forge ids are globally unique, but keying by
// org + id keeps dedup/comparison correct regardless of that assumption.
const siteKey = (site: ISite) => `${site.org_slug ?? ""}:${site.id}`;

export default function Command() {
  const { sites: sitesTokenOne, loading: loadingOne } = useAllSites("laravel_forge_api_key");
  const { sites: sitesTokenTwo, loading: loadingTwo } = useAllSites("laravel_forge_api_key_two");
  const allSites = [...(sitesTokenOne ?? []), ...(sitesTokenTwo ?? [])];
  const deploying = allSites.filter((site: ISite) => site.deployment_status === "deploying");

  const newDeploying = deploying.filter((site: ISite) => {
    // find any that were null but now are deploying
    return lastStatus().find((last: ISite) => siteKey(last) === siteKey(site))?.deployment_status !== "deploying";
  });

  if (newDeploying.length > 0) {
    const toShow = newDeploying[0];
    // Seems the best we can do?
    runAppleScript(
      `display notification "Deploying ${escapeAppleScript(toShow.name ?? "site")}" with title "Laravel Forge"`
    );
  }
  if (allSites?.length) cache.set("deploying-last-status", JSON.stringify(allSites));

  // Clear out any sites that have been deploying for more than 3 minutes
  const IdsToKeep = recentlyDeployed().filter((entry: { id: string; timestamp: number }) => {
    return new Date().getTime() - entry.timestamp < 1000 * 60 * 3;
  });
  cache.set("deploying-ids", JSON.stringify(IdsToKeep));

  // Add any sites currently deploying to the cache, and update their timestamp
  deploying.forEach((site: ISite) => {
    const deployingIds = recentlyDeployed().filter((entry: { id: string }) => entry.id !== siteKey(site));
    const entry: RecentEntry = {
      id: siteKey(site),
      timestamp: new Date().getTime(),
    };
    cache.set("deploying-ids", JSON.stringify([...deployingIds, entry]));
  });

  const recentlyActive = recentlyDeployed()
    .map((entry: RecentEntry) => allSites?.find((site: ISite) => siteKey(site) === entry.id) ?? {})
    .filter((site: ISite) => site?.id && site.deployment_status !== "deploying");

  useEffect(() => {
    updateCommandMetadata({ subtitle: deploying?.length > 0 ? "Deploying..." : "Idle" });
  }, [deploying]);

  return (
    <MenuBarExtra
      isLoading={loadingOne || loadingTwo}
      icon={{
        source: "forge-icon-64.png",
        mask: Image.Mask.Circle,
        tintColor: deploying?.length > 0 ? "#19b69c" : { light: "#000000", dark: "#ffffff", adjustContrast: false },
      }}
      tooltip="Laravel Forge"
    >
      {deploying?.length > 0 && <MenuBarExtra.Item key="currently-deploying" title="Current Activity" />}
      {deploying.map((site: ISite) => (
        <MenuBarExtra.Item
          key={"current" + site.id}
          title={site?.name ?? site?.aliases?.[0] ?? "Unknown"}
          subtitle={site?.deployment_status === "deploying" ? "deploying..." : site?.deployment_status ?? "deployed"}
          tooltip="Open in Raycast"
          onAction={() =>
            launchCommand({
              name: "index",
              type: LaunchType.UserInitiated,
              arguments: { server: String(site.server_id) },
            })
          }
        />
      ))}
      {recentlyActive?.length > 0 && <MenuBarExtra.Item key="recent-activity" title="Recent Activity" />}
      {recentlyActive.map((site: ISite) => (
        <MenuBarExtra.Item
          key={"recent" + site.id}
          title={site?.name ?? site?.aliases?.[0] ?? "Unknown"}
          subtitle={site?.deployment_status ?? "deployed"}
          tooltip="Open in Raycast"
          onAction={() =>
            launchCommand({
              name: "index",
              type: LaunchType.UserInitiated,
              arguments: { server: String(site.server_id) },
            })
          }
        />
      ))}
    </MenuBarExtra>
  );
}
