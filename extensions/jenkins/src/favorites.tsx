import { ActionPanel, Action, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { listFavorites, removeFavorite, FavoriteJob } from "./lib/storage";
import { listJenkins } from "./lib/storage";
import { JenkinsAPI, Jenkins } from "./lib/api";

interface FavoriteWithStatus extends FavoriteJob {
  status?: string;
  color?: string;
  jenkinsName?: string;
  isBuilding?: boolean;
  lastBuildNumber?: number;
  lastBuildDuration?: number;
  shortClass?: string;
}

export default function Command() {
  const [favorites, setFavorites] = useState<FavoriteWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getStatusIcon = (color?: string) => {
    if (!color) return { source: Icon.Circle, tintColor: Color.SecondaryText };

    if (color.includes("anime")) {
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    }

    if (color.startsWith("blue")) {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    } else if (color.startsWith("red")) {
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    } else if (color.startsWith("yellow")) {
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    } else if (color.startsWith("grey") || color.startsWith("disabled") || color.startsWith("aborted")) {
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }

    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return "";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const favs = await listFavorites();
      const jenkinsList = await listJenkins();

      // Create a map of Jenkins instances by ID
      const jenkinsMap = new Map<string, Jenkins>();
      jenkinsList.forEach((j) => jenkinsMap.set(j.id, j));

      // Fetch status for each favorite
      const favsWithStatus: FavoriteWithStatus[] = [];
      for (const fav of favs) {
        const jenkins = jenkinsMap.get(fav.jenkinsId);
        const favWithStatus: FavoriteWithStatus = {
          ...fav,
          jenkinsName: jenkins?.name || "Unknown",
        };

        if (jenkins) {
          try {
            const jenkinsAPI = new JenkinsAPI(jenkins);
            // Parse job path from URL to get the correct job structure
            const jobPaths = fav.jobPath.split("/").filter((p) => p);
            const resp = await jenkinsAPI.inspect(jobPaths.length > 0 ? jobPaths : undefined);

            // Try to find the job in the response
            const job = resp.jobs?.find((j) => j.url === fav.jobUrl);
            if (job) {
              favWithStatus.color = job.color;
              favWithStatus.status = job.color?.replace("_anime", "") || "unknown";
              favWithStatus.isBuilding = job.color?.includes("anime");

              // Get job type
              if (job._class) {
                const classParts = job._class.split(".");
                favWithStatus.shortClass = classParts[classParts.length - 1];
              }

              // Fetch detailed build info
              try {
                const detailedResp = await jenkinsAPI.inspect(jobPaths);
                const lastBuild = detailedResp.builds?.[0];
                if (lastBuild) {
                  favWithStatus.lastBuildNumber = lastBuild.number;
                  favWithStatus.lastBuildDuration = lastBuild.duration;
                }
              } catch (err) {
                // Ignore errors fetching build details
              }
            }
          } catch (err) {
            console.error(`Failed to fetch status for ${fav.jobName}:`, err);
          }
        }

        favsWithStatus.push(favWithStatus);
      }

      setFavorites(favsWithStatus);
    } catch (err) {
      showToast({ style: Toast.Style.Failure, title: "Failed to Load Favorites", message: String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemoveFavorite = async (fav: FavoriteJob) => {
    try {
      await removeFavorite(fav.jenkinsId, fav.jobUrl);
      setFavorites((prev) => prev.filter((f) => !(f.jenkinsId === fav.jenkinsId && f.jobUrl === fav.jobUrl)));
      showToast(Toast.Style.Success, "Removed from Favorites");
    } catch (err) {
      showToast(Toast.Style.Failure, "Failed to Remove Favorite", String(err));
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search favorites...">
      <List.EmptyView
        title="No Favorites"
        description="Add jobs to favorites using Cmd+F in the Manage Jobs view"
        icon={Icon.Star}
      />
      {favorites.length > 0 && (
        <List.Section title="Favorite Jobs" subtitle={favorites.length + ""}>
          {favorites.map((fav) => {
            const statusIcon = getStatusIcon(fav.color);

            // Build accessories with job type, build info, and Jenkins name
            const accessories: List.Item.Accessory[] = [];

            // Job type tag
            if (fav.shortClass) {
              const typeMap: Record<string, string> = {
                WorkflowJob: "Pipeline",
                FreeStyleProject: "Freestyle",
                WorkflowMultiBranchProject: "Multibranch",
                Folder: "Folder",
              };
              const typeLabel = typeMap[fav.shortClass] || fav.shortClass;
              accessories.push({ tag: { value: typeLabel, color: Color.SecondaryText } });
            }

            // Build info
            if (fav.isBuilding) {
              accessories.push({ text: "Building", icon: { source: Icon.CircleProgress, tintColor: Color.Blue } });
            } else if (fav.lastBuildNumber) {
              const duration = formatDuration(fav.lastBuildDuration);
              accessories.push({ text: `#${fav.lastBuildNumber}${duration ? ` • ${duration}` : ""}` });
            }

            // Jenkins instance name
            if (fav.jenkinsName) {
              accessories.push({ text: fav.jenkinsName, tooltip: "Jenkins Instance" });
            }

            return (
              <List.Item
                key={fav.jobUrl}
                title={fav.jobName}
                icon={statusIcon}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser title="Open in Browser" url={fav.jobUrl} />
                      <Action
                        icon={Icon.StarDisabled}
                        title="Remove from Favorites"
                        onAction={() => handleRemoveFavorite(fav)}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={loadFavorites}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                      <Action.CopyToClipboard
                        icon={Icon.CopyClipboard}
                        title="Copy URL"
                        content={fav.jobUrl}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel.Section>
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
