import { Detail, ActionPanel, Action, showToast, Toast, Clipboard, Icon, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execSync } from "child_process";
import { getFishPath } from "../utils/getFishPath";
import { useEffect, useState, useRef } from "react";
import { getPluginMeta } from "../utils/getPluginMeta";
import { GITHUB_HEADERS } from "../utils/github";

interface PluginDetailProps {
  plugin: string;
  onRemove?: () => void;
  onInstall?: () => void;
}

export default function PluginDetail({ plugin, onRemove, onInstall }: PluginDetailProps) {
  const fishPath = getFishPath();
  const meta = getPluginMeta(plugin);
  const githubUrl = meta?.url ?? `https://github.com/${plugin}`;
  const isCore = plugin === "jorgebucaran/fisher";

  const [isInstalled, setIsInstalled] = useState(false);
  const [stars, setStars] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const fetched = useRef(false);

  useEffect(() => {
    try {
      const result = execSync(`${fishPath} -l -c "fisher list"`, { encoding: "utf-8" });
      const plugins = result
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      setIsInstalled(plugins.includes(plugin));
    } catch {
      setIsInstalled(false);
    }

    if (fetched.current) return;
    fetched.current = true;

    const fetchGitHubInfo = async () => {
      const match = githubUrl.match(/github.com\/(.*?)\/(.*)/);
      if (!match) return;
      const [owner, repo] = [match[1], match[2]];
      const cacheKey = `${owner}/${repo}`;

      const cachedJson = await LocalStorage.getItem<string>(cacheKey);

      if (cachedJson) {
        try {
          const cached = JSON.parse(cachedJson);
          const now = Date.now();
          const cacheAge = now - (cached.timestamp || 0);
          const maxAge = 24 * 60 * 60 * 1000;

          const hasValidCache =
            cacheAge < maxAge && cached.stars != null && cached.updated != null && cached.latestVersion != null;

          if (hasValidCache) {
            setStars(cached.stars);
            setLastUpdated(cached.updated);
            setLatestVersion(cached.latestVersion);
            return;
          }
        } catch {
          // If parsing fails, fetch fresh data
        }
      }

      const headers = GITHUB_HEADERS as Record<string, string>;

      const [metaRes, relRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, { headers }),
      ]);

      let stargazers = null;
      let updated = null;
      let latest = null;

      if (metaRes.ok) {
        const data = await metaRes.json();
        stargazers = data.stargazers_count?.toString() ?? "–";
        updated = data.updated_at ? new Date(data.updated_at).toLocaleDateString() : "–";
        setStars(stargazers);
        setLastUpdated(updated);
      }

      if (relRes.ok) {
        const release = await relRes.json();
        latest = release.tag_name?.replace(/^v/, "") ?? null;
        setLatestVersion(latest);
      }

      await LocalStorage.setItem(
        cacheKey,
        JSON.stringify({
          stars: stargazers,
          updated,
          latestVersion: latest,
          timestamp: Date.now(),
        }),
      );
    };

    fetchGitHubInfo();
  }, [fishPath, githubUrl, plugin]);

  const handleInstall = () => {
    try {
      execSync(`${fishPath} -l -c "fisher install ${plugin}"`);
      showToast({ style: Toast.Style.Success, title: `Installed ${plugin}` });
      setIsInstalled(true);
      onInstall?.();
    } catch (err) {
      showFailureToast(err as Error, { title: `Failed to install ${plugin}` });
    }
  };

  const handleUpdate = () => {
    try {
      execSync(`${fishPath} -l -c "fisher update ${plugin}"`);
      showToast({ style: Toast.Style.Success, title: `Updated ${plugin}` });
    } catch (err) {
      showFailureToast(err as Error, { title: `Failed to update ${plugin}` });
    }
  };

  const handleRemove = () => {
    try {
      execSync(`${fishPath} -l -c "fisher remove ${plugin}"`);
      showToast({ style: Toast.Style.Success, title: `Removed ${plugin}` });
      setIsInstalled(false);
      onRemove?.();
    } catch (err) {
      showFailureToast(err as Error, { title: `Failed to remove ${plugin}` });
    }
  };

  const handleCopyGithubUrl = async () => {
    try {
      await Clipboard.copy(githubUrl);
      showToast({ style: Toast.Style.Success, title: "Copied GitHub URL" });
    } catch (err) {
      showFailureToast(err as Error, { title: "Failed to copy GitHub URL" });
    }
  };

  const handleCopyInstallCommand = async () => {
    const repo = githubUrl.replace("https://github.com/", "");
    const command = `fisher install ${repo}`;
    try {
      await Clipboard.copy(command);
      showToast({ style: Toast.Style.Success, title: "Copied Install Command" });
    } catch (err) {
      showFailureToast(err as Error, { title: "Failed to copy install command" });
    }
  };

  const markdown = `# ${plugin}

${meta?.description ? meta.description : isCore ? "A plugin manager for Fish" : "No description available."}`;

  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.Link title="GitHub" text={githubUrl.replace("https://", "")} target={githubUrl} />
      <Detail.Metadata.Label title="Stars" text={stars ?? "–"} icon={Icon.Star} />
      <Detail.Metadata.Label title="Last Updated" text={lastUpdated ?? "–"} icon={Icon.Clock} />
      <Detail.Metadata.Label title="Latest Version" text={latestVersion ?? "–"} icon={Icon.Tag} />
    </Detail.Metadata>
  );

  return (
    <Detail
      markdown={markdown}
      metadata={metadata}
      actions={
        <ActionPanel>
          {isInstalled ? (
            isCore ? (
              <>
                <Action.OpenInBrowser title="Open on GitHub" url={githubUrl} />
                <Action title="Copy GitHub URL" onAction={handleCopyGithubUrl} />
              </>
            ) : (
              <>
                <Action title="Copy Install Command" onAction={handleCopyInstallCommand} />
                <Action title="Copy GitHub URL" onAction={handleCopyGithubUrl} />
                <Action title="Update Plugin" onAction={handleUpdate} shortcut={{ modifiers: ["cmd"], key: "u" }} />
                <Action.OpenInBrowser
                  title="Open on GitHub"
                  url={githubUrl}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action
                  title="Remove Plugin"
                  style={Action.Style.Destructive}
                  onAction={handleRemove}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              </>
            )
          ) : (
            <>
              <Action title="Install Plugin" onAction={handleInstall} icon={Icon.Download} />
              <Action title="Copy GitHub URL" onAction={handleCopyGithubUrl} />
              <Action
                title="Copy Install Command"
                onAction={handleCopyInstallCommand}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Open on GitHub"
                url={githubUrl}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
