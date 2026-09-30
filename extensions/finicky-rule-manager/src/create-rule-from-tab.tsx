import { Action, ActionPanel, BrowserExtension, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { loadRules, saveRules, getDefaultBrowser } from "./storage";
import { Rule } from "./types";
import { expandTilde } from "./utils/path";
import { generateFinickyConfig, writeConfigFile } from "./utils/finicky";

interface Tab {
  id: number;
  title?: string;
  url: string;
  favicon?: string;
  active: boolean;
}

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "";
  }
}

function generateRuleName(url: string, title?: string): string {
  const domain = extractDomain(url);
  if (title && title !== domain) {
    return title.length > 50 ? `${title.substring(0, 47)}...` : title;
  }
  return domain || "New Rule";
}

function generatePattern(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Generate a pattern that matches the domain and all subdomains
    const domainParts = hostname.split(".");
    let baseDomain = hostname;

    // If it's a subdomain (more than 2 parts), extract the base domain
    if (domainParts.length > 2) {
      baseDomain = domainParts.slice(-2).join(".");
    }

    return `*://*.${baseDomain}/*`;
  } catch {
    return "";
  }
}

async function syncConfigFile(args: { configPath: string; defaultBrowser: string; rules: Rule[] }) {
  const configPath = expandTilde(args.configPath);
  const contents = generateFinickyConfig({ defaultBrowser: args.defaultBrowser, rules: args.rules });
  await writeConfigFile({ configPath, configContents: contents });
}

export default function Command() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultBrowser, setDefaultBrowser] = useState<string>("");
  const preferences = getPreferenceValues<{ configPath?: string }>();
  const configPath = (preferences.configPath ?? "").trim();

  useEffect(() => {
    async function fetchTabs() {
      try {
        const [openTabs, browser] = await Promise.all([BrowserExtension.getTabs(), getDefaultBrowser()]);
        setTabs(openTabs);
        setDefaultBrowser(browser);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch browser tabs",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTabs();
  }, []);

  async function createRuleFromTab(tab: Tab) {
    const pattern = generatePattern(tab.url);
    if (!pattern) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Could not generate pattern from this tab",
      });
      return;
    }

    const rule: Rule = {
      id: uuid(),
      name: generateRuleName(tab.url, tab.title),
      enabled: true,
      matchType: "wildcards",
      patterns: [pattern],
      browser: defaultBrowser,
    };

    try {
      const existingRules = await loadRules();
      const updatedRules = [...existingRules, rule];
      await saveRules(updatedRules);

      if (configPath) {
        await syncConfigFile({ configPath, defaultBrowser, rules: updatedRules });
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Rule created",
        message: `Pattern: ${pattern}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create rule",
        message: String(error),
      });
    }
  }

  const groupedTabs = tabs.reduce(
    (acc, tab) => {
      const domain = extractDomain(tab.url);
      if (!acc[domain]) {
        acc[domain] = [];
      }
      acc[domain].push(tab);
      return acc;
    },
    {} as Record<string, Tab[]>,
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search open tabs...">
      {Object.entries(groupedTabs).map(([domain, domainTabs]) => (
        <List.Section key={domain} title={domain} subtitle={`${domainTabs.length} tab(s)`}>
          {domainTabs.map((tab) => (
            <List.Item
              key={tab.id}
              title={tab.title || tab.url}
              subtitle={tab.url}
              icon={tab.favicon ? { source: tab.favicon } : Icon.Globe}
              accessories={[
                ...(tab.active ? [{ icon: Icon.Dot, tooltip: "Active Tab" }] : []),
                { text: generatePattern(tab.url) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Rule from Tab"
                    icon={Icon.Plus}
                    onAction={async () => {
                      await createRuleFromTab(tab);
                    }}
                  />
                  <Action.OpenInBrowser url={tab.url} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={tab.url}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Pattern"
                    content={generatePattern(tab.url)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {tabs.length === 0 && !isLoading && (
        <List.EmptyView
          title="No browser tabs found"
          description="Make sure you have the Raycast Browser Extension installed and enabled."
          icon={Icon.Globe}
        />
      )}
    </List>
  );
}
