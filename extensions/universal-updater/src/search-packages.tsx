import {
  Action,
  ActionPanel,
  List,
  Icon,
  Toast,
  showToast,
  getPreferenceValues,
  popToRoot,
  AI,
  environment,
  Detail,
} from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fetch from "node-fetch";

const execAsync = promisify(exec);

import {
  EcosystemId,
  installPackage,
  isEcosystemAvailable,
} from "./ecosystems";

const ECOSYSTEM_NAMES: Record<EcosystemId, string> = {
  brew: "Homebrew",
  npm: "npm",
  yarn: "yarn",
  pnpm: "pnpm",
  pip: "pip",
  pipx: "pipx",
  cargo: "cargo",
  gem: "RubyGems",
  mas: "Mac App Store",
  go: "Go",
  bun: "bun",
  deno: "deno",
  composer: "composer",
};

type SearchResult = {
  name: string;
  description?: string;
  version?: string;
};

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const enabledEcosystems = useMemo(
    () =>
      (Object.keys(ECOSYSTEM_NAMES) as EcosystemId[]).filter(
        (id) =>
          prefs[
            `enable${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof Preferences
          ],
      ),
    [],
  );

  const [ecosystem, setEcosystem] = useState<EcosystemId>(
    enabledEcosystems[0] || "npm",
  );
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string>("");
  const [brewCache, setBrewCache] = useState<{ name: string; desc: string }[]>(
    [],
  );

  // Pre-fetch Homebrew JSON API in background for instant 0ms search
  useEffect(() => {
    if (enabledEcosystems.includes("brew")) {
      (async () => {
        try {
          const [fRes, cRes] = await Promise.all([
            fetch("https://formulae.brew.sh/api/formula.json"),
            fetch("https://formulae.brew.sh/api/cask.json"),
          ]);
          const formulae = (await fRes.json()) as any[];
          const casks = (await cRes.json()) as any[];

          const combined = [
            ...formulae.map((f) => ({
              name: f.name,
              desc: f.desc || "Homebrew Formula",
            })),
            ...casks.map((c) => ({
              name: c.token,
              desc: c.desc || "Homebrew Cask",
            })),
          ];
          setBrewCache(combined);
        } catch (e) {
          console.error("Failed to fetch brew cache", e);
        }
      })();
    }
  }, [enabledEcosystems]);

  useEffect(() => {
    let active = true;

    async function performSearch() {
      if (!searchText.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let items: SearchResult[] = [];

        // Live search only implemented for some, otherwise fallback to exact input
        if (
          ecosystem === "npm" ||
          ecosystem === "yarn" ||
          ecosystem === "pnpm" ||
          ecosystem === "bun"
        ) {
          const res = await fetch(
            `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchText)}&size=20`,
          );
          const json = (await res.json()) as any;
          items = json.objects.map((obj: any) => ({
            name: obj.package.name,
            description: obj.package.description,
            version: obj.package.version,
          }));
        } else if (ecosystem === "composer") {
          const res = await fetch(
            `https://packagist.org/search.json?q=${encodeURIComponent(searchText)}&per_page=15`,
          );
          const json = (await res.json()) as any;
          items = json.results.map((r: any) => ({
            name: r.name,
            description: r.description,
          }));
        } else if (ecosystem === "brew") {
          // Instant 0ms memory search from pre-fetched JSON
          if (brewCache.length > 0) {
            const query = searchText.toLowerCase().trim();
            const filtered = brewCache
              .filter(
                (p) =>
                  p.name.toLowerCase().includes(query) ||
                  p.desc.toLowerCase().includes(query),
              )
              .slice(0, 30);
            items = filtered.map((p) => ({
              name: p.name,
              description: p.desc,
            }));
          } else {
            // Fallback to slow terminal search if API failed or hasn't loaded yet
            try {
              const { stdout } = await execAsync(
                `brew search /${searchText.trim()}/ | head -n 20`,
              );
              const lines = stdout
                .split("\n")
                .filter(
                  (l: string) => l.trim().length > 0 && !l.includes("==>"),
                );
              items = lines.map((name: string) => ({
                name: name.trim(),
                description: `Install via Homebrew`,
              }));
            } catch (err) {
              items = [];
            }
          }
        } else if (ecosystem === "pip" || ecosystem === "pipx") {
          // Fallback for others, just show the exact text as an option
          items = [
            {
              name: searchText.trim(),
              description: `Install ${searchText} via ${ECOSYSTEM_NAMES[ecosystem]} (Exact Match Only)`,
            },
          ];
        } else {
          items = [
            {
              name: searchText.trim(),
              description: `Install ${searchText} via ${ECOSYSTEM_NAMES[ecosystem]}`,
            },
          ];
        }

        if (active) {
          setResults(items);
        }
      } catch (e) {
        if (active) {
          setResults([
            {
              name: searchText.trim(),
              description:
                "Search failed, but you can still try installing this exact name.",
            },
          ]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    const timer = setTimeout(() => {
      void performSearch();
    }, 150); // Lightning fast debounce

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchText, ecosystem]);

  async function handleInstall(pkgName: string) {
    if (!pkgName) return;

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${pkgName}...`,
    });

    try {
      const available = await isEcosystemAvailable(ecosystem);
      if (!available) {
        throw new Error(
          `${ECOSYSTEM_NAMES[ecosystem]} is not available on this system.`,
        );
      }

      await installPackage(ecosystem, pkgName);
      toast.style = Toast.Style.Success;
      toast.title = `Installed ${pkgName}`;
      setTimeout(() => popToRoot(), 1500);
    } catch (err: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Installation failed";
      toast.message = err?.message ?? String(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (enabledEcosystems.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No ecosystems enabled"
          description="Please enable at least one in the extension preferences."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${ECOSYSTEM_NAMES[ecosystem]} packages...`}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Package Manager"
          value={ecosystem}
          onChange={(v) => {
            setEcosystem(v as EcosystemId);
            setSearchText("");
            setResults([]);
          }}
        >
          {enabledEcosystems.map((id) => (
            <List.Dropdown.Item
              key={id}
              value={id}
              title={ECOSYSTEM_NAMES[id]}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Results">
        {results.map((pkg) => (
          <List.Item
            key={pkg.name}
            title={pkg.name}
            subtitle={pkg.description}
            accessories={pkg.version ? [{ text: pkg.version }] : []}
            icon={Icon.Box}
            actions={
              <ActionPanel>
                <Action
                  title="Install Package"
                  icon={Icon.Download}
                  onAction={() => void handleInstall(pkg.name)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {searchText.trim().length > 2 && environment.canAccess(AI) && (
        <List.Section title="AI Intelligence">
          {aiRecommendation ? (
            <List.Item
              title="🤖 AI Recommendation"
              subtitle="Press Enter to read full response"
              icon={Icon.Stars}
              detail={
                <List.Item.Detail
                  markdown={`# AI Recommendation\n\n${aiRecommendation}`}
                />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Full AI Response"
                    icon={Icon.Eye}
                    target={
                      <Detail
                        markdown={`# 🤖 AI Package Recommendation\n\n**Query:** ${searchText}\n\n${aiRecommendation}`}
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Response"
                    content={aiRecommendation}
                  />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              title={`Ask AI to recommend a ${ECOSYSTEM_NAMES[ecosystem]} package for "${searchText}"...`}
              icon={Icon.Stars}
              actions={
                <ActionPanel>
                  <Action
                    title="Ask AI"
                    icon={Icon.Stars}
                    onAction={async () => {
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Asking AI...",
                      });
                      try {
                        const response = await AI.ask(
                          `What is the best and most popular ${ECOSYSTEM_NAMES[ecosystem]} package or tool for: ${searchText}? Give a brief recommendation and the exact install command.`,
                        );
                        setAiRecommendation(response);
                        toast.style = Toast.Style.Success;
                        toast.title = "AI Found Recommendations!";
                      } catch (err: any) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "AI Request Failed";
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}

      {results.length === 0 && searchText.trim() === "" && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={`Search ${ECOSYSTEM_NAMES[ecosystem]}`}
          description="Type to search for packages to install."
        />
      )}
    </List>
  );
}
