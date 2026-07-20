import {
  AI,
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
  showToast,
} from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  EcosystemId,
  getChangelogUrl,
  getPackageUrl,
  installPackage,
  isEcosystemAvailable,
  listInstalledPackages,
  run,
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

const POPULAR_SUGGESTIONS: Record<EcosystemId, SearchResult[]> = {
  brew: [
    { name: "git", description: "Distributed revision control system" },
    {
      name: "node",
      description:
        "Platform built on V8 to build fast, scalable network applications",
    },
    {
      name: "python",
      description:
        "Interpreted, interactive, object-oriented programming language",
    },
    {
      name: "curl",
      description: "Get a file from an HTTP, HTTPS or FTP server",
    },
    { name: "wget", description: "Internet file retriever" },
    {
      name: "docker",
      description: "Pack, ship and run applications as lightweight containers",
    },
    { name: "gh", description: "GitHub command-line tool" },
    {
      name: "neovim",
      description: "Vim-fork focused on extensibility and usability",
    },
    { name: "tmux", description: "Terminal multiplexer" },
    {
      name: "jq",
      description: "Lightweight and flexible command-line JSON processor",
    },
  ],
  npm: [
    { name: "lodash", description: "Modular JavaScript utility library" },
    {
      name: "axios",
      description: "Promise based HTTP client for the browser and node.js",
    },
    {
      name: "express",
      description: "Fast, unopinionated, minimalist web framework",
    },
    {
      name: "typescript",
      description: "Superset of JavaScript that compiles to clean JavaScript",
    },
    {
      name: "react",
      description: "JavaScript library for building user interfaces",
    },
    { name: "prettier", description: "An opinionated code formatter" },
    {
      name: "eslint",
      description: "An AST-based pattern checker for JavaScript",
    },
    { name: "uuid", description: "RFC4122 UUID generation" },
  ],
  yarn: [
    { name: "lodash", description: "Modular JavaScript utility library" },
    {
      name: "axios",
      description: "Promise based HTTP client for the browser and node.js",
    },
    {
      name: "typescript",
      description: "Superset of JavaScript that compiles to clean JavaScript",
    },
    {
      name: "react",
      description: "JavaScript library for building user interfaces",
    },
  ],
  pnpm: [
    { name: "lodash", description: "Modular JavaScript utility library" },
    {
      name: "axios",
      description: "Promise based HTTP client for the browser and node.js",
    },
    {
      name: "typescript",
      description: "Superset of JavaScript that compiles to clean JavaScript",
    },
    {
      name: "react",
      description: "JavaScript library for building user interfaces",
    },
  ],
  bun: [
    { name: "lodash", description: "Modular JavaScript utility library" },
    {
      name: "axios",
      description: "Promise based HTTP client for the browser and node.js",
    },
    {
      name: "typescript",
      description: "Superset of JavaScript that compiles to clean JavaScript",
    },
    {
      name: "react",
      description: "JavaScript library for building user interfaces",
    },
  ],
  pip: [
    { name: "requests", description: "Python HTTP for Humans" },
    {
      name: "numpy",
      description: "Fundamental package for array computing in Python",
    },
    {
      name: "pandas",
      description: "Powerful data analysis and manipulation library for Python",
    },
    { name: "pytest", description: "Simple powerful testing with Python" },
    { name: "black", description: "The uncompromising code formatter" },
    { name: "flake8", description: "The modular source code checker" },
    { name: "django", description: "A high-level Python Web framework" },
    {
      name: "flask",
      description: "A lightweight WSGI web application framework",
    },
  ],
  pipx: [
    { name: "black", description: "The uncompromising Python code formatter" },
    { name: "flake8", description: "The modular source code checker" },
    {
      name: "poetry",
      description: "Python packaging and dependency management made easy",
    },
    {
      name: "httpie",
      description: "User-friendly CLI HTTP client for the API era",
    },
    { name: "ansible", description: "Radically simple IT automation platform" },
  ],
  cargo: [
    {
      name: "serde",
      description: "A generic serialization/deserialization framework for Rust",
    },
    {
      name: "tokio",
      description: "An event-driven, non-blocking I/O platform for Rust",
    },
    { name: "rand", description: "Random number generators and relations" },
    { name: "clap", description: "Command Line Argument Parser" },
    {
      name: "regex",
      description: "An implementation of regular expressions for Rust",
    },
    { name: "reqwest", description: "An easy and powerful Rust HTTP Client" },
  ],
  gem: [
    { name: "rails", description: "Ruby on Rails web framework" },
    {
      name: "bundler",
      description: "Manage your Ruby application's gem dependencies",
    },
    {
      name: "jekyll",
      description: "A simple, blog-aware, static site generator",
    },
    { name: "rspec", description: "BDD for Ruby" },
    { name: "nokogiri", description: "HTML, XML, SAX, and Reader parser" },
  ],
  composer: [
    {
      name: "monolog/monolog",
      description:
        "Sends your logs to files, sockets, inboxes, databases, etc.",
    },
    { name: "guzzlehttp/guzzle", description: "PHP HTTP client library" },
    { name: "phpunit/phpunit", description: "The PHP Unit Testing framework" },
    {
      name: "symfony/console",
      description: "Eases the creation of beautiful command line interfaces",
    },
  ],
  go: [
    {
      name: "github.com/gin-gonic/gin",
      description: "HTTP web framework written in Go",
    },
    {
      name: "github.com/spf13/cobra",
      description: "A Commander for modern Go CLI interactions",
    },
    {
      name: "go.uber.org/zap",
      description: "Blazing fast, structured, leveled logging in Go",
    },
  ],
  deno: [
    { name: "std", description: "Standard Library for Deno" },
    {
      name: "oak",
      description: "A middleware framework for Deno's native HTTP server",
    },
    { name: "fresh", description: "The next-gen web framework for Deno" },
  ],
  mas: [
    { name: "Xcode", description: "IDE for Apple development" },
    { name: "Slack", description: "Team communication platform" },
    { name: "Pages", description: "Apple word processor" },
    { name: "Keynote", description: "Apple presentation tool" },
  ],
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

  const initialEcosystem = enabledEcosystems[0] || "npm";
  const [ecosystem, setEcosystem] = useState<EcosystemId>(initialEcosystem);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>(
    POPULAR_SUGGESTIONS[initialEcosystem] || [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string>("");
  const [installedPackages, setInstalledPackages] = useState<
    Map<string, string>
  >(new Map());

  // Use a ref to hold the current abort controller so we can cancel stale requests
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    async function loadInstalled() {
      try {
        const available = await isEcosystemAvailable(ecosystem);
        if (!available) {
          setInstalledPackages(new Map());
          return;
        }
        const pkgs = await listInstalledPackages(ecosystem);
        if (active) {
          const map = new Map<string, string>();
          for (const p of pkgs) {
            map.set(p.name.toLowerCase(), p.current);
          }
          setInstalledPackages(map);
        }
      } catch {
        if (active) setInstalledPackages(new Map());
      }
    }
    void loadInstalled();
    return () => {
      active = false;
    };
  }, [ecosystem]);

  useEffect(() => {
    if (!searchText.trim()) {
      setResults(POPULAR_SUGGESTIONS[ecosystem] || []);
      setIsLoading(false);
      return;
    }

    // Debounce: wait 300ms after last keystroke before firing
    const timer = setTimeout(() => {
      // Cancel any previously running request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);

      (async () => {
        try {
          let items: SearchResult[] = [];

          if (
            ecosystem === "npm" ||
            ecosystem === "yarn" ||
            ecosystem === "pnpm" ||
            ecosystem === "bun"
          ) {
            const res = await fetch(
              `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchText)}&size=20`,
              { signal: controller.signal as any },
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
              { signal: controller.signal as any },
            );
            const json = (await res.json()) as any;
            items = json.results.map((r: any) => ({
              name: r.name,
              description: r.description,
            }));
          } else if (ecosystem === "pip" || ecosystem === "pipx") {
            try {
              const res = await fetch(
                `https://pypi.org/search/?q=${encodeURIComponent(searchText)}`,
                {
                  signal: controller.signal as any,
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  },
                },
              );
              if (res.ok) {
                const html = await res.text();
                // Parse package snippet components from PyPI search page
                const regex =
                  /<a class="package-snippet"[\s\S]*?<span class="package-snippet__name">([^<]+)<\/span>[\s\S]*?<span class="package-snippet__version">([^<]+)<\/span>[\s\S]*?<p class="package-snippet__description">([^<]+)<\/p>/g;
                let match;
                const matches: SearchResult[] = [];
                while (
                  (match = regex.exec(html)) !== null &&
                  matches.length < 15
                ) {
                  matches.push({
                    name: match[1].trim(),
                    version: match[2].trim(),
                    description: match[3].trim(),
                  });
                }
                items = matches;
              }

              if (items.length === 0) {
                // Fallback to exact match lookup
                const exactRes = await fetch(
                  `https://pypi.org/pypi/${encodeURIComponent(searchText.trim())}/json`,
                  { signal: controller.signal as any },
                );
                if (exactRes.ok) {
                  const json = (await exactRes.json()) as any;
                  items = [
                    {
                      name: json.info.name,
                      description: json.info.summary,
                      version: json.info.version,
                    },
                  ];
                } else {
                  items = [
                    {
                      name: searchText.trim(),
                      description: `Install "${searchText}" via pip (exact name)`,
                    },
                  ];
                }
              }
            } catch {
              items = [
                { name: searchText.trim(), description: `Install via pip` },
              ];
            }
          } else if (ecosystem === "cargo") {
            // crates.io search API
            try {
              const res = await fetch(
                `https://crates.io/api/v1/crates?q=${encodeURIComponent(searchText)}&per_page=20`,
                {
                  signal: controller.signal as any,
                  headers: { "User-Agent": "Universal-Updater-Raycast/1.0" },
                },
              );
              const json = (await res.json()) as any;
              items = (json.crates ?? []).map((c: any) => ({
                name: c.id,
                description: c.description,
                version: c.newest_version,
              }));
            } catch {
              items = [
                { name: searchText.trim(), description: `Install via cargo` },
              ];
            }
          } else if (ecosystem === "gem") {
            // RubyGems search API
            try {
              const res = await fetch(
                `https://rubygems.org/api/v1/search.json?query=${encodeURIComponent(searchText)}`,
                { signal: controller.signal as any },
              );
              const json = (await res.json()) as any;
              items = (Array.isArray(json) ? json : [])
                .slice(0, 20)
                .map((g: any) => ({
                  name: g.name,
                  description: g.info,
                  version: g.version,
                }));
            } catch {
              items = [
                { name: searchText.trim(), description: `Install via gem` },
              ];
            }
          } else if (ecosystem === "brew") {
            // Homebrew formula/cask search via local CLI (using canonical shell run for path resolution)
            try {
              const safeSearch = searchText
                .replace(new RegExp("[^a-zA-Z0-9\\-_./@+]", "g"), "")
                .trim();
              if (!safeSearch) {
                items = [];
              } else {
                const quotedSearch = `'${safeSearch.replaceAll("'", "'\\''")}'`;
                const stdout = await run(
                  `brew search ${quotedSearch} | head -n 20`,
                );
                const lines = stdout
                  .split("\n")
                  .map((l) => l.trim())
                  .filter((l) => l.length > 0 && !l.startsWith("==>"));
                items = lines.map((name) => ({
                  name,
                  description: "Homebrew formula or cask",
                }));
              }
            } catch {
              items = [
                {
                  name: searchText.trim(),
                  description: `Install via Homebrew`,
                },
              ];
            }
          } else {
            items = [
              {
                name: searchText.trim(),
                description: `Install via ${ECOSYSTEM_NAMES[ecosystem]}`,
              },
            ];
          }

          // Local filter of popular suggestions matching the search query
          const localMatches = (POPULAR_SUGGESTIONS[ecosystem] || []).filter(
            (p) => p.name.toLowerCase().includes(searchText.toLowerCase()),
          );

          // Deduplicate items: if a popular package is also returned by the API, keep only one copy
          const combined = [...localMatches];
          for (const item of items) {
            if (
              !combined.some(
                (c) => c.name.toLowerCase() === item.name.toLowerCase(),
              )
            ) {
              combined.push(item);
            }
          }

          if (!controller.signal.aborted) {
            setResults(combined);
          }
        } catch (e: any) {
          if (e?.name === "AbortError") return;
          if (!controller.signal.aborted) {
            setResults([
              {
                name: searchText.trim(),
                description:
                  "Search failed — you can still try installing this exact name.",
              },
            ]);
          }
        } finally {
          if (!controller.signal.aborted) setIsLoading(false);
        }
      })();
    }, 300);

    return () => {
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
          icon={Icon.Gear}
          title="No ecosystems enabled"
          description="Enable at least one ecosystem in the extension preferences, then come back to search and install packages."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
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
            const nextEco = v as EcosystemId;
            setEcosystem(nextEco);
            setSearchText("");
            setResults(POPULAR_SUGGESTIONS[nextEco] || []);
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
      <List.Section
        title={searchText.trim() === "" ? "Popular Packages" : "Results"}
      >
        {results.map((pkg) => (
          <List.Item
            key={pkg.name}
            title={pkg.name}
            subtitle={pkg.description}
            accessories={(() => {
              const accs: List.Item.Accessory[] = [];
              const installedVersion = installedPackages.get(
                pkg.name.toLowerCase(),
              );

              if (installedVersion) {
                if (pkg.version && pkg.version !== installedVersion) {
                  accs.push({
                    tag: {
                      value: `Installed: ${installedVersion} (Outdated)`,
                      color: Color.Yellow,
                    },
                    icon: Icon.Warning,
                  });
                } else {
                  accs.push({
                    tag: {
                      value: pkg.version
                        ? `Installed: v${installedVersion}`
                        : "Installed",
                      color: Color.Green,
                    },
                    icon: Icon.Check,
                  });
                }
              }

              if (pkg.version) {
                accs.push({ text: `Latest: v${pkg.version}` });
              }

              return accs;
            })()}
            icon={Icon.Box}
            actions={(() => {
              const pkgUrl = getPackageUrl(ecosystem, pkg.name);
              const changelogUrl = getChangelogUrl(ecosystem, pkg.name);

              return (
                <ActionPanel>
                  <ActionPanel.Section title="Installation">
                    <Action
                      title="Install Package"
                      icon={Icon.Download}
                      onAction={() => void handleInstall(pkg.name)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Package Info & Links">
                    {pkgUrl && (
                      <Action.OpenInBrowser
                        title="Open Official Website"
                        url={pkgUrl}
                        icon={Icon.Globe}
                      />
                    )}
                    {changelogUrl && (
                      <Action.OpenInBrowser
                        title="Open Changelog / Releases"
                        url={changelogUrl}
                        icon={Icon.Book}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
                      />
                    )}
                    {environment.canAccess(AI) && (
                      <Action.Push
                        title="Explain Package with AI"
                        icon={Icon.Stars}
                        target={
                          <AIPackageExplanation
                            name={pkg.name}
                            ecosystem={ECOSYSTEM_NAMES[ecosystem]}
                          />
                        }
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                    )}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Copy & Share">
                    <Action.CopyToClipboard
                      title="Copy Package Name"
                      content={pkg.name}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Copy Install Command"
                      icon={Icon.Terminal}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                      onAction={() => {
                        const cmds: Record<string, string> = {
                          brew: `brew install ${pkg.name}`,
                          npm: `npm install -g ${pkg.name}`,
                          yarn: `yarn global add ${pkg.name}`,
                          pnpm: `pnpm add -g ${pkg.name}`,
                          bun: `bun install -g ${pkg.name}`,
                          pip: `pip install ${pkg.name}`,
                          pipx: `pipx install ${pkg.name}`,
                          cargo: `cargo install ${pkg.name}`,
                          gem: `gem install ${pkg.name}`,
                          composer: `composer global require ${pkg.name}`,
                          deno: `deno install -g ${pkg.name}`,
                          go: `go install ${pkg.name}@latest`,
                        };
                        Clipboard.copy(
                          cmds[ecosystem] ?? `${ecosystem} install ${pkg.name}`,
                        );
                      }}
                    />
                    {pkgUrl && (
                      <Action
                        title="Copy Markdown Link"
                        icon={Icon.Link}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                        onAction={() =>
                          Clipboard.copy(`[${pkg.name}](${pkgUrl})`)
                        }
                      />
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              );
            })()}
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
          description="Type a package name to see install options, links, and AI help."
        />
      )}
    </List>
  );
}

function AIPackageExplanation(props: { name: string; ecosystem: string }) {
  const [explanation, setExplanation] = useState("Asking AI...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function ask() {
      try {
        const response = await AI.ask(
          `Explain what the ${props.ecosystem} package '${props.name}' does, its main use cases, and how to use it in one paragraph. Keep it concise, professional, and clear.`,
        );
        setExplanation(response);
      } catch (err: any) {
        setExplanation(
          `Failed to get explanation from AI: ${err?.message ?? String(err)}`,
        );
      } finally {
        setIsLoading(false);
      }
    }
    void ask();
  }, [props.name, props.ecosystem]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# 🤖 AI Explanation: ${props.name}\n\n${explanation}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Explanation"
            content={explanation}
          />
        </ActionPanel>
      }
    />
  );
}
