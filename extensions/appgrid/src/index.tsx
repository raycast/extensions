import {
  Grid,
  ActionPanel,
  Action,
  Icon,
  getApplications,
  Application,
  showToast,
  Toast,
  LocalStorage,
  open,
} from "@raycast/api";
import { useState, useEffect, useMemo, useCallback } from "react";

// Detect system language from system preferences
const getLocale = (): "en" | "ko" | "ja" => {
  try {
    // Use Intl API to detect system language
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
    if (systemLocale.startsWith("ko")) return "ko";
    if (systemLocale.startsWith("ja")) return "ja";
    return "en";
  } catch {
    return "en";
  }
};

// Multilingual translations
const translations = {
  en: {
    searchPlaceholder: "Search applications...",
    launchApp: "Launch Application",
    launching: "Launching",
    showInFinder: "Show in Finder",
    copyPath: "Copy Application Path",
    copyBundleId: "Copy Bundle ID",
    failedToLoad: "Failed to load applications",
    failedToLaunch: "Failed to launch application",
    allApps: "All Apps",
    usageCount: "times",
    viewModes: {
      flatName: "📱 All Apps (A-Z)",
      flatUsage: "📱 All Apps (Most Used)",
      grouped: "📂 By Category (All)",
    },
    categories: {
      "frequently-used": "⭐️ Frequently Used",
      development: "💻 Development",
      productivity: "📝 Productivity",
      communication: "💬 Communication",
      entertainment: "🎮 Entertainment",
      utilities: "🔧 Utilities",
      others: "📦 Others",
    },
    dropdownSections: {
      allView: "All Apps View",
      categoryView: "Category Groups",
    },
  },
  ko: {
    searchPlaceholder: "애플리케이션 검색...",
    launchApp: "앱 실행",
    launching: "실행 중",
    showInFinder: "Finder에서 보기",
    copyPath: "경로 복사",
    copyBundleId: "번들 ID 복사",
    failedToLoad: "앱 로드 실패",
    failedToLaunch: "앱 실행 실패",
    allApps: "전체 앱",
    usageCount: "회",
    viewModes: {
      flatName: "📱 전체 앱 (이름순)",
      flatUsage: "📱 전체 앱 (사용빈도순)",
      grouped: "📂 카테고리별 (전체)",
    },
    categories: {
      "frequently-used": "⭐️ 자주 사용",
      development: "💻 개발",
      productivity: "📝 생산성",
      communication: "💬 커뮤니케이션",
      entertainment: "🎮 엔터테인먼트",
      utilities: "🔧 유틸리티",
      others: "📦 기타",
    },
    dropdownSections: {
      allView: "전체 보기",
      categoryView: "카테고리별 그룹",
    },
  },
  ja: {
    searchPlaceholder: "アプリを検索...",
    launchApp: "アプリを起動",
    launching: "起動中",
    showInFinder: "Finderで表示",
    copyPath: "パスをコピー",
    copyBundleId: "バンドルIDをコピー",
    failedToLoad: "アプリの読み込みに失敗",
    failedToLaunch: "アプリの起動に失敗",
    allApps: "すべてのアプリ",
    usageCount: "回",
    viewModes: {
      flatName: "📱 すべてのアプリ (名前順)",
      flatUsage: "📱 すべてのアプリ (使用頻度順)",
      grouped: "📂 カテゴリ別 (すべて)",
    },
    categories: {
      "frequently-used": "⭐️ よく使う",
      development: "💻 開発",
      productivity: "📝 生産性",
      communication: "💬 コミュニケーション",
      entertainment: "🎮 エンターテインメント",
      utilities: "🔧 ユーティリティ",
      others: "📦 その他",
    },
    dropdownSections: {
      allView: "すべて表示",
      categoryView: "カテゴリグループ",
    },
  },
};

// Category mapping for apps
const getCategoryForApp = (app: Application): CategoryType => {
  const name = app.name.toLowerCase();
  const bundleId = (app.bundleId || "").toLowerCase();

  // Development tools
  if (
    name.includes("xcode") ||
    name.includes("android studio") ||
    name.includes("visual studio") ||
    name.includes("webstorm") ||
    name.includes("intellij") ||
    name.includes("pycharm") ||
    name.includes("sublime") ||
    name.includes("vscode") ||
    name.includes("cursor") ||
    name.includes("terminal") ||
    name.includes("iterm") ||
    name.includes("docker") ||
    name.includes("postman") ||
    bundleId.includes("developer") ||
    bundleId.includes("jetbrains")
  ) {
    return "development";
  }

  // Communication
  if (
    name.includes("slack") ||
    name.includes("discord") ||
    name.includes("teams") ||
    name.includes("zoom") ||
    name.includes("skype") ||
    name.includes("telegram") ||
    name.includes("kakaotalk") ||
    name.includes("mail") ||
    name.includes("messenger") ||
    name.includes("whatsapp")
  ) {
    return "communication";
  }

  // Productivity
  if (
    name.includes("notion") ||
    name.includes("obsidian") ||
    name.includes("evernote") ||
    name.includes("bear") ||
    name.includes("todoist") ||
    name.includes("trello") ||
    name.includes("asana") ||
    name.includes("word") ||
    name.includes("excel") ||
    name.includes("powerpoint") ||
    name.includes("keynote") ||
    name.includes("pages") ||
    name.includes("numbers") ||
    name.includes("alfred") ||
    name.includes("raycast")
  ) {
    return "productivity";
  }

  // Entertainment
  if (
    name.includes("spotify") ||
    name.includes("music") ||
    name.includes("vlc") ||
    name.includes("netflix") ||
    name.includes("youtube") ||
    name.includes("steam") ||
    name.includes("epic games") ||
    name.includes("tv") ||
    bundleId.includes("game")
  ) {
    return "entertainment";
  }

  // Utilities
  if (
    name.includes("finder") ||
    name.includes("activity monitor") ||
    name.includes("disk utility") ||
    name.includes("cleanmymac") ||
    name.includes("cleaner") ||
    name.includes("magnet") ||
    name.includes("rectangle") ||
    name.includes("bartender") ||
    name.includes("1password") ||
    name.includes("bitwarden") ||
    name.includes("calculator") ||
    name.includes("calendar") ||
    bundleId.includes("utility")
  ) {
    return "utilities";
  }

  return "others";
};

interface AppUsageData {
  [bundleId: string]: {
    lastUsed: string;
    usageCount: number;
  };
}

interface AppGroup {
  name: string;
  apps: Application[];
}

type CategoryType =
  | "frequently-used"
  | "development"
  | "productivity"
  | "communication"
  | "entertainment"
  | "utilities"
  | "others";

type SortType = "usage" | "name";
type FilterType = "all" | CategoryType;
type ViewMode = "grouped" | "flat";

export default function Command() {
  const locale = getLocale();
  const t = translations[locale];

  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [usageData, setUsageData] = useState<AppUsageData>({});
  const [sortBy, setSortBy] = useState<SortType>("usage");
  const [filterCategory, setFilterCategory] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");

  useEffect(() => {
    loadApplications();
  }, []);

  const loadUsageData = async () => {
    try {
      const storedData = await LocalStorage.getItem<string>("appUsageData");
      if (storedData) {
        const data = JSON.parse(storedData);
        setUsageData(data);
        return data;
      }
      return {};
    } catch (error) {
      console.error("Failed to load usage data:", error);
      return {};
    }
  };

  const loadApplications = async () => {
    try {
      setIsLoading(true);

      // Load usage data first
      const currentUsageData = await loadUsageData();
      setUsageData(currentUsageData);

      const applications = await getApplications();

      // Filter out Parallels apps and system apps
      const filteredApps = applications.filter((app) => {
        // Skip Parallels apps
        if (app.path.includes("Parallels")) {
          return false;
        }
        // Skip Windows apps from Parallels
        if (app.bundleId && app.bundleId.startsWith("com.parallels")) {
          return false;
        }
        return true;
      });

      setApps(filteredApps);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.failedToLoad,
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateUsageData = useCallback(async (app: Application) => {
    const bundleId = app.bundleId || app.path; // Use path as fallback if bundleId is missing

    setUsageData((prevUsageData) => {
      const newUsageData = { ...prevUsageData };
      newUsageData[bundleId] = {
        lastUsed: new Date().toISOString(),
        usageCount: (newUsageData[bundleId]?.usageCount || 0) + 1,
      };

      // Save to LocalStorage asynchronously
      LocalStorage.setItem("appUsageData", JSON.stringify(newUsageData));

      return newUsageData;
    });
  }, []);

  const launchApp = useCallback(
    async (app: Application) => {
      try {
        await updateUsageData(app);
        // Open application using its path
        await open(app.path);
        await showToast({
          style: Toast.Style.Success,
          title: `${t.launching} ${app.name}`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: t.failedToLaunch,
          message: String(error),
        });
      }
    },
    [updateUsageData, t],
  );

  // Group apps by category with memoization
  const groupedApps = useMemo(() => {
    // Apply search filter first
    const filtered = searchText
      ? apps.filter((app) => app.name.toLowerCase().includes(searchText.toLowerCase()))
      : apps;

    // Flat view mode: no grouping, just sort all apps
    if (viewMode === "flat") {
      const sortedApps = [...filtered].sort((a, b) => {
        if (sortBy === "usage") {
          const aUsage = usageData[a.bundleId || a.path]?.usageCount || 0;
          const bUsage = usageData[b.bundleId || b.path]?.usageCount || 0;
          if (aUsage !== bUsage) {
            return bUsage - aUsage;
          }
        }
        return a.name.localeCompare(b.name);
      });

      return [
        {
          name: t.allApps,
          apps: sortedApps,
        },
      ];
    }

    // Grouped view mode: categorize apps
    const groups: Record<CategoryType, Application[]> = {
      "frequently-used": [],
      development: [],
      productivity: [],
      communication: [],
      entertainment: [],
      utilities: [],
      others: [],
    };

    // Categorize apps
    filtered.forEach((app) => {
      const usage = usageData[app.bundleId || app.path]?.usageCount || 0;

      // Frequently used apps (more than 5 uses)
      if (usage > 5) {
        groups["frequently-used"].push(app);
      }

      // Category based on app type
      const category = getCategoryForApp(app);
      if (category !== "frequently-used") {
        groups[category].push(app);
      }
    });

    // Sort apps within each group
    Object.keys(groups).forEach((key) => {
      const category = key as CategoryType;
      groups[category].sort((a, b) => {
        if (sortBy === "usage") {
          // Sort by usage count first
          const aUsage = usageData[a.bundleId || a.path]?.usageCount || 0;
          const bUsage = usageData[b.bundleId || b.path]?.usageCount || 0;
          if (aUsage !== bUsage) {
            return bUsage - aUsage;
          }
        }
        // Then by name
        return a.name.localeCompare(b.name);
      });
    });

    // Convert to array of groups (only non-empty groups)
    const result: AppGroup[] = [];
    const categoryOrder: CategoryType[] = [
      "frequently-used",
      "development",
      "productivity",
      "communication",
      "entertainment",
      "utilities",
      "others",
    ];

    // Apply category filter
    const categoriesToShow = filterCategory === "all" ? categoryOrder : [filterCategory];

    categoriesToShow.forEach((category) => {
      if (groups[category].length > 0) {
        result.push({
          name: t.categories[category],
          apps: groups[category],
        });
      }
    });

    return result;
  }, [apps, usageData, searchText, sortBy, filterCategory, viewMode, t]);

  return (
    <Grid
      columns={6}
      searchBarPlaceholder={t.searchPlaceholder}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      inset={Grid.Inset.Small}
      aspectRatio="1"
      throttle
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter and Sort Options"
          storeValue={true}
          defaultValue="grouped|usage|all"
          onChange={(value) => {
            const [view, sort, filter] = value.split("|");
            setViewMode(view as ViewMode);
            setSortBy(sort as SortType);
            setFilterCategory(filter as FilterType);
          }}
        >
          <Grid.Dropdown.Section title={t.dropdownSections.allView}>
            <Grid.Dropdown.Item value="flat|name|all" title={t.viewModes.flatName} />
            <Grid.Dropdown.Item value="flat|usage|all" title={t.viewModes.flatUsage} />
          </Grid.Dropdown.Section>

          <Grid.Dropdown.Section title={t.dropdownSections.categoryView}>
            <Grid.Dropdown.Item value="grouped|usage|all" title={t.viewModes.grouped} />
            <Grid.Dropdown.Item value="grouped|usage|frequently-used" title={t.categories["frequently-used"]} />
            <Grid.Dropdown.Item value="grouped|usage|development" title={t.categories.development} />
            <Grid.Dropdown.Item value="grouped|usage|productivity" title={t.categories.productivity} />
            <Grid.Dropdown.Item value="grouped|usage|communication" title={t.categories.communication} />
            <Grid.Dropdown.Item value="grouped|usage|entertainment" title={t.categories.entertainment} />
            <Grid.Dropdown.Item value="grouped|usage|utilities" title={t.categories.utilities} />
            <Grid.Dropdown.Item value="grouped|usage|others" title={t.categories.others} />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {groupedApps.map((group) => (
        <Grid.Section key={group.name} title={group.name}>
          {group.apps.map((app) => {
            const usage = usageData[app.bundleId || app.path];
            const usageCount = usage?.usageCount || 0;

            return (
              <Grid.Item
                key={app.bundleId || app.path}
                content={{ fileIcon: app.path }}
                title={app.name}
                subtitle={usageCount > 0 ? `${usageCount} ${t.usageCount}` : ""}
                actions={
                  <ActionPanel>
                    <Action title={t.launchApp} icon={Icon.Play} onAction={() => launchApp(app)} />
                    <Action.ShowInFinder title={t.showInFinder} path={app.path} />
                    <Action.CopyToClipboard
                      title={t.copyPath}
                      content={app.path}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {app.bundleId && (
                      <Action.CopyToClipboard
                        title={t.copyBundleId}
                        content={app.bundleId}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      ))}
    </Grid>
  );
}
