import { ActionPanel, List, Action, getPreferenceValues, LocalStorage, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

interface Preferences {
  laravelVersion: string;
  openInNewTab: boolean;
}

interface DocItem {
  title: string;
  path: string;
  keywords?: string[];
}

interface DocSection {
  title: string;
  items: DocItem[];
}

const VERSIONS = [
  { title: "Laravel Master (Beta)", value: "master" },
  { title: "Laravel 12.x (Latest)", value: "12.x" },
  { title: "Laravel 11.x (LTS)", value: "11.x" },
  { title: "Laravel 10.x", value: "10.x" },
  { title: "Laravel 9.x", value: "9.x" },
  { title: "Laravel 8.x", value: "8.x" },
  { title: "Laravel 7.x", value: "7.x" },
  { title: "Laravel 6.x", value: "6.x" },
  { title: "Laravel 5.8", value: "5.8" },
  { title: "Laravel 5.7", value: "5.7" },
  { title: "Laravel 5.6", value: "5.6" },
  { title: "Laravel 5.5", value: "5.5" },
  { title: "Laravel 5.4", value: "5.4" },
  { title: "Laravel 5.3", value: "5.3" },
  { title: "Laravel 5.2", value: "5.2" },
  { title: "Laravel 5.1", value: "5.1" },
  { title: "Laravel 5.0", value: "5.0" },
];

const LARAVEL_DOCS: DocSection[] = [
  {
    title: "Prologue",
    items: [
      { title: "Release Notes", path: "releases" },
      { title: "Upgrade Guide", path: "upgrade" },
      { title: "Contribution Guide", path: "contributions" },
    ],
  },
  {
    title: "Getting Started",
    items: [
      { title: "Installation", path: "installation", keywords: ["setup", "install"] },
      { title: "Configuration", path: "configuration", keywords: ["env", "environment"] },
      { title: "Directory Structure", path: "structure", keywords: ["folders", "files"] },
      { title: "Frontend", path: "frontend", keywords: ["js", "css", "assets"] },
      { title: "Starter Kits", path: "starter-kits", keywords: ["breeze", "jetstream"] },
      { title: "Deployment", path: "deployment", keywords: ["production", "server"] },
    ],
  },
  {
    title: "Architecture Concepts",
    items: [
      { title: "Request Lifecycle", path: "lifecycle", keywords: ["request", "boot"] },
      { title: "Service Container", path: "container", keywords: ["ioc", "dependency injection", "di"] },
      { title: "Service Providers", path: "providers", keywords: ["boot", "register"] },
      { title: "Facades", path: "facades", keywords: ["static", "proxy"] },
    ],
  },
  {
    title: "The Basics",
    items: [
      { title: "Routing", path: "routing", keywords: ["routes", "url", "web", "api"] },
      { title: "Middleware", path: "middleware", keywords: ["filter", "request"] },
      { title: "CSRF Protection", path: "csrf", keywords: ["token", "security"] },
      { title: "Controllers", path: "controllers", keywords: ["handler", "action"] },
      { title: "Requests", path: "requests", keywords: ["input", "form"] },
      { title: "Responses", path: "responses", keywords: ["output", "json", "view"] },
      { title: "Views", path: "views", keywords: ["template", "html"] },
      { title: "Blade Templates", path: "blade", keywords: ["template", "components", "slots"] },
      { title: "Asset Bundling", path: "vite", keywords: ["vite", "css", "js", "build"] },
      { title: "URL Generation", path: "urls", keywords: ["links", "route"] },
      { title: "Session", path: "session", keywords: ["storage", "flash"] },
      { title: "Validation", path: "validation", keywords: ["rules", "form", "input"] },
      { title: "Error Handling", path: "errors", keywords: ["exceptions", "debug"] },
      { title: "Logging", path: "logging", keywords: ["log", "debug", "monolog"] },
    ],
  },
  {
    title: "Digging Deeper",
    items: [
      { title: "Artisan Console", path: "artisan", keywords: ["cli", "commands"] },
      { title: "Broadcasting", path: "broadcasting", keywords: ["websocket", "pusher", "realtime"] },
      { title: "Cache", path: "cache", keywords: ["redis", "memcached", "storage"] },
      { title: "Collections", path: "collections", keywords: ["array", "map", "filter"] },
      { title: "Concurrency", path: "concurrency", keywords: ["parallel", "async"] },
      { title: "Context", path: "context", keywords: ["request context"] },
      { title: "Contracts", path: "contracts", keywords: ["interfaces"] },
      { title: "Events", path: "events", keywords: ["listeners", "dispatch"] },
      { title: "File Storage", path: "filesystem", keywords: ["files", "s3", "disk"] },
      { title: "Helpers", path: "helpers", keywords: ["functions", "utilities"] },
      { title: "HTTP Client", path: "http-client", keywords: ["guzzle", "api", "fetch"] },
      { title: "Localization", path: "localization", keywords: ["translation", "lang", "i18n"] },
      { title: "Mail", path: "mail", keywords: ["email", "smtp", "mailables"] },
      { title: "Notifications", path: "notifications", keywords: ["email", "sms", "slack"] },
      { title: "Package Development", path: "packages", keywords: ["library", "composer"] },
      { title: "Processes", path: "processes", keywords: ["shell", "exec", "command"] },
      { title: "Queues", path: "queues", keywords: ["jobs", "workers", "async"] },
      { title: "Rate Limiting", path: "rate-limiting", keywords: ["throttle", "limit"] },
      { title: "Strings", path: "strings", keywords: ["str", "text", "fluent"] },
      { title: "Task Scheduling", path: "scheduling", keywords: ["cron", "schedule", "jobs"] },
    ],
  },
  {
    title: "Security",
    items: [
      { title: "Authentication", path: "authentication", keywords: ["login", "auth", "user"] },
      { title: "Authorization", path: "authorization", keywords: ["gates", "policies", "permissions"] },
      { title: "Email Verification", path: "verification", keywords: ["verify", "email"] },
      { title: "Encryption", path: "encryption", keywords: ["encrypt", "decrypt", "secure"] },
      { title: "Hashing", path: "hashing", keywords: ["bcrypt", "password", "hash"] },
      { title: "Password Reset", path: "passwords", keywords: ["forgot", "reset", "email"] },
    ],
  },
  {
    title: "Database",
    items: [
      { title: "Getting Started", path: "database", keywords: ["db", "mysql", "postgres"] },
      { title: "Query Builder", path: "queries", keywords: ["sql", "select", "where", "join"] },
      { title: "Pagination", path: "pagination", keywords: ["pages", "limit", "offset"] },
      { title: "Migrations", path: "migrations", keywords: ["schema", "table", "columns"] },
      { title: "Seeding", path: "seeding", keywords: ["seed", "data", "factory"] },
      { title: "Redis", path: "redis", keywords: ["cache", "pubsub"] },
      { title: "MongoDB", path: "mongodb", keywords: ["nosql", "document"] },
    ],
  },
  {
    title: "Eloquent ORM",
    items: [
      { title: "Getting Started", path: "eloquent", keywords: ["model", "orm", "active record"] },
      { title: "Relationships", path: "eloquent-relationships", keywords: ["hasMany", "belongsTo", "pivot"] },
      { title: "Collections", path: "eloquent-collections", keywords: ["array", "model collection"] },
      { title: "Mutators / Casts", path: "eloquent-mutators", keywords: ["accessors", "mutators", "cast"] },
      { title: "API Resources", path: "eloquent-resources", keywords: ["json", "transform", "api"] },
      { title: "Serialization", path: "eloquent-serialization", keywords: ["json", "toArray"] },
      { title: "Factories", path: "eloquent-factories", keywords: ["testing", "fake", "seed"] },
    ],
  },
  {
    title: "Testing",
    items: [
      { title: "Getting Started", path: "testing", keywords: ["phpunit", "pest", "test"] },
      { title: "HTTP Tests", path: "http-tests", keywords: ["feature", "integration", "request"] },
      { title: "Console Tests", path: "console-tests", keywords: ["artisan", "command"] },
      { title: "Browser Tests", path: "dusk", keywords: ["dusk", "selenium", "e2e"] },
      { title: "Database Testing", path: "database-testing", keywords: ["refresh", "factory"] },
      { title: "Mocking", path: "mocking", keywords: ["mock", "fake", "spy"] },
    ],
  },
  {
    title: "Packages",
    items: [
      { title: "Breeze", path: "starter-kits#laravel-breeze", keywords: ["auth", "starter"] },
      { title: "Cashier (Stripe)", path: "billing", keywords: ["payments", "subscriptions", "stripe"] },
      { title: "Cashier (Paddle)", path: "cashier-paddle", keywords: ["payments", "subscriptions"] },
      { title: "Dusk", path: "dusk", keywords: ["browser", "testing", "selenium"] },
      { title: "Envoy", path: "envoy", keywords: ["deploy", "ssh", "tasks"] },
      { title: "Fortify", path: "fortify", keywords: ["auth", "backend"] },
      { title: "Folio", path: "folio", keywords: ["pages", "file-based routing"] },
      { title: "Homestead", path: "homestead", keywords: ["vagrant", "vm", "development"] },
      { title: "Horizon", path: "horizon", keywords: ["queue", "dashboard", "redis"] },
      { title: "MCP", path: "mcp", keywords: ["model context protocol", "ai"] },
      { title: "Mix", path: "mix", keywords: ["webpack", "assets", "legacy"] },
      { title: "Octane", path: "octane", keywords: ["swoole", "roadrunner", "performance"] },
      { title: "Passport", path: "passport", keywords: ["oauth", "api", "tokens"] },
      { title: "Pennant", path: "pennant", keywords: ["feature flags", "toggles"] },
      { title: "Pint", path: "pint", keywords: ["code style", "formatter", "php-cs-fixer"] },
      { title: "Precognition", path: "precognition", keywords: ["validation", "live", "frontend"] },
      { title: "Prompts", path: "prompts", keywords: ["cli", "interactive", "console"] },
      { title: "Pulse", path: "pulse", keywords: ["monitoring", "dashboard", "performance"] },
      { title: "Reverb", path: "reverb", keywords: ["websocket", "realtime", "server"] },
      { title: "Sail", path: "sail", keywords: ["docker", "development", "container"] },
      { title: "Sanctum", path: "sanctum", keywords: ["api", "tokens", "spa", "auth"] },
      { title: "Scout", path: "scout", keywords: ["search", "algolia", "meilisearch"] },
      { title: "Socialite", path: "socialite", keywords: ["oauth", "social login", "google", "github"] },
      { title: "Telescope", path: "telescope", keywords: ["debug", "dashboard", "monitoring"] },
      { title: "Valet", path: "valet", keywords: ["macos", "development", "nginx"] },
    ],
  },
];

function getDocUrl(path: string, version: string): string {
  return `https://laravel.com/docs/${version}/${path}`;
}

function getLaracastsUrl(topic: string): string {
  return `https://laracasts.com/search?q=${encodeURIComponent(topic)}`;
}

const MAX_RECENT = 10;
const MAX_FAVORITES = 20;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [version, setVersion] = useState(preferences.laravelVersion || "12.x");
  const openInNewTab = preferences.openInNewTab !== false;
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  // Load saved data from local storage
  useEffect(() => {
    LocalStorage.getItem<string>("selectedVersion").then((savedVersion) => {
      if (savedVersion) {
        setVersion(savedVersion);
      }
    });
    LocalStorage.getItem<string>("favorites").then((savedFavorites) => {
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    });
    LocalStorage.getItem<string>("recentPages").then((savedRecent) => {
      if (savedRecent) {
        setRecent(JSON.parse(savedRecent));
      }
    });
  }, []);

  // Save version to local storage when changed
  const handleVersionChange = async (newVersion: string) => {
    setVersion(newVersion);
    await LocalStorage.setItem("selectedVersion", newVersion);
  };

  // Toggle favorite
  const toggleFavorite = async (path: string) => {
    let newFavorites: string[];
    if (favorites.includes(path)) {
      newFavorites = favorites.filter((f) => f !== path);
      showToast({ style: Toast.Style.Success, title: "Removed from favorites" });
    } else {
      if (favorites.length >= MAX_FAVORITES) {
        showToast({ style: Toast.Style.Failure, title: "Maximum favorites reached" });
        return;
      }
      newFavorites = [...favorites, path];
      showToast({ style: Toast.Style.Success, title: "Added to favorites" });
    }
    setFavorites(newFavorites);
    await LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
  };

  // Add to recent
  const addToRecent = async (path: string) => {
    const newRecent = [path, ...recent.filter((r) => r !== path)].slice(0, MAX_RECENT);
    setRecent(newRecent);
    await LocalStorage.setItem("recentPages", JSON.stringify(newRecent));
  };

  // Get doc item by path
  const getDocByPath = (path: string): { item: DocItem; section: string } | null => {
    for (const section of LARAVEL_DOCS) {
      const item = section.items.find((i) => i.path === path);
      if (item) {
        return { item, section: section.title };
      }
    }
    return null;
  };

  // Render a doc item
  const renderDocItem = (item: DocItem, sectionTitle: string, showFavoriteIcon = false) => {
    const url = getDocUrl(item.path, version);
    const isFavorite = favorites.includes(item.path);

    return (
      <List.Item
        key={item.path}
        icon={showFavoriteIcon && isFavorite ? Icon.Star : { source: "laravel-icon.png" }}
        title={item.title}
        subtitle={version}
        keywords={item.keywords}
        accessories={[...(isFavorite ? [{ icon: Icon.Star }] : []), { text: sectionTitle }]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {openInNewTab ? (
                <>
                  <Action.OpenInBrowser title="Open in Browser" url={url} onOpen={() => addToRecent(item.path)} />
                  <Action.CopyToClipboard content={url} title="Copy URL" />
                </>
              ) : (
                <>
                  <Action.CopyToClipboard title="Copy URL" content={url} onCopy={() => addToRecent(item.path)} />
                  <Action.OpenInBrowser title="Open in Browser" url={url} />
                </>
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title="Favorites">
              <Action
                icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => toggleFavorite(item.path)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Learn More">
              <Action.OpenInBrowser icon={Icon.Video} title="Search on Laracasts" url={getLaracastsUrl(item.title)} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Laravel Version">
              {VERSIONS.map((v) => (
                <Action
                  key={v.value}
                  title={v.value === version ? `✓ ${v.title}` : v.title}
                  onAction={() => handleVersionChange(v.value)}
                />
              ))}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  // Get favorite items
  const favoriteItems = favorites
    .map((path) => getDocByPath(path))
    .filter((item): item is { item: DocItem; section: string } => item !== null);

  // Get recent items (excluding favorites to avoid duplication)
  const recentItems = recent
    .filter((path) => !favorites.includes(path))
    .map((path) => getDocByPath(path))
    .filter((item): item is { item: DocItem; section: string } => item !== null);

  return (
    <List searchBarPlaceholder="Search Laravel documentation...">
      {/* Favorites Section */}
      {favoriteItems.length > 0 && (
        <List.Section title="⭐ Favorites">
          {favoriteItems.map(({ item, section }) => renderDocItem(item, section, true))}
        </List.Section>
      )}

      {/* Recent Section */}
      {recentItems.length > 0 && (
        <List.Section title="🕐 Recent">
          {recentItems.map(({ item, section }) => renderDocItem(item, section))}
        </List.Section>
      )}

      {/* All Documentation */}
      {LARAVEL_DOCS.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((item) => renderDocItem(item, section.title))}
        </List.Section>
      ))}
    </List>
  );
}
