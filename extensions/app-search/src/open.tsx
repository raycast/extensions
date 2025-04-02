import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getApplications,
  getPreferenceValues as getSettings,
  Icon,
  Image,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import Fuse from "fuse.js";
import fetch from "node-fetch";
import { useEffect, useMemo, useState } from "react";
import EditOpenable from "./EditOpenable";
import {
  AppPreferences,
  asyncGetAppIcon,
  DeepSettings,
  defaultPreferences,
  getRunningApps,
  HitHistory,
  Openable,
  runTerminalCommand,
  SortType,
  ToggleableAppPreferences,
} from "./imports";
import NewOpenable from "./NewOpenable";
const FARTHEST_BACK_HIT_DATE = 1000 * 60 * 60 * 24 * 30; // 30 days

export default function Command() {
  const settings = getSettings<DeepSettings>();
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const [applications, setApplications] = useState<Openable[]>([]);
  const [websites, setWebsites] = useState<Openable[]>([]);
  const [directories, setDirectories] = useState<Openable[]>([]);
  const [hitHistory, setHitHistory] = useState<HitHistory>({});
  const [isLoading, setIsLoading] = useState(true);
  const [sortType, setSortType] = useState<SortType>("frecency");
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  const allOpenables = useMemo(() => {
    return applications.concat(websites).concat(directories);
  }, [applications, websites, directories]);

  const [lambdaDecay, fuzzySearchThreshold, timeScale] = useMemo(() => {
    return [
      parseFloat(settings.lambdaDecayDropdown),
      parseFloat(settings.fuzzySearchThresholdDropdown),
      parseFloat(settings.timeScaleDropdown),
    ];
  }, []);

  const [pins, regular, hidden] = useMemo(() => {
    return [
      allOpenables
        .filter((app) => preferences.pinnedApps.includes(app.id) && passesSearchFilter(app).passes)
        .sort(sortFunction),
      allOpenables
        .filter(
          (app) =>
            !preferences.pinnedApps.includes(app.id) &&
            passesSearchFilter(app).passes &&
            !preferences.hidden.includes(app.id),
        )
        .sort(sortFunction),
      allOpenables
        .filter((app) => preferences.hidden.includes(app.id) && passesSearchFilter(app).passes)
        .sort(sortFunction),
    ];
  }, [allOpenables, preferences, sortType, searchText]);

  useEffect(() => {
    async function initApp() {
      let parsedWebsites: Openable[] = [];
      let parsedDirectories: Openable[] = [];

      const [unparsedHitHistoryJSON, unparsedPreferencesJSON, unparsedWebsitesJSON, unparsedDirectoriesJSON, apps] =
        await Promise.all([
          LocalStorage.getItem<string>("hitHistory"),
          LocalStorage.getItem<string>("appPreferences"),
          LocalStorage.getItem<string>("websites"),
          LocalStorage.getItem<string>("directories"),
          getApplications().then((apps) => apps.filter((app) => app && app.bundleId)),
        ]);

      if (unparsedWebsitesJSON) {
        try {
          parsedWebsites = JSON.parse(unparsedWebsitesJSON) as Openable[];
          setWebsites(parsedWebsites);
        } catch (error) {
          console.error("Error loading websites:", error);
        }
      }

      if (unparsedDirectoriesJSON) {
        try {
          parsedDirectories = JSON.parse(unparsedDirectoriesJSON);
          setDirectories(parsedDirectories);
        } catch (error) {
          console.error("Error loading directories:", error);
        }
      }

      if (unparsedHitHistoryJSON) {
        try {
          const parsedHitHistory: HitHistory = JSON.parse(unparsedHitHistoryJSON);
          const cutoff = new Date(new Date().getTime() - FARTHEST_BACK_HIT_DATE);

          const purgedHitHistory: HitHistory = {};
          for (const hitHistoryItem of Object.entries(parsedHitHistory)) {
            const [appId, timestamps] = hitHistoryItem;
            const newTimestamps = timestamps.filter((timestamp) => new Date(timestamp) > cutoff);
            if (newTimestamps.length > 0) {
              purgedHitHistory[appId] = newTimestamps;
            }
          }

          LocalStorage.setItem("hitHistory", JSON.stringify(purgedHitHistory));
          setHitHistory(purgedHitHistory);
        } catch (error) {
          console.error("Error loading hit history:", error);
        }
      } else {
        setHitHistory({});
      }

      let soonToBePreferences: AppPreferences = defaultPreferences;
      if (unparsedPreferencesJSON) {
        try {
          const parsedPreferences = JSON.parse(unparsedPreferencesJSON);
          soonToBePreferences = Object.fromEntries(
            Object.keys(defaultPreferences).map((key) => [
              key,
              parsedPreferences[key] ?? defaultPreferences[key as keyof AppPreferences],
            ]),
          ) as AppPreferences;
          setPreferences(soonToBePreferences);
          await LocalStorage.setItem("appPreferences", JSON.stringify(soonToBePreferences));
        } catch (error) {
          console.error("Error loading preferences:", error);
        }
      }

      try {
        const runningApps = !settings.fastMode ? await getRunningApps() : new Set();
        const imagePaths = soonToBePreferences.cachedIconDirectories;
        if (!settings.fastMode) {
          for (const app of apps) {
            if (!imagePaths[app.bundleId!]) {
              const iconPath = await asyncGetAppIcon({
                appName: app.path.split("/").pop()!.replace(".app", ""),
                appPath: app.path,
              });
              imagePaths[app.bundleId!] = { default: iconPath, custom: null };
            }
          }
        }
        setPreferences({ ...soonToBePreferences, cachedIconDirectories: imagePaths });
        await LocalStorage.setItem(
          "appPreferences",
          JSON.stringify({ ...soonToBePreferences, cachedIconDirectories: imagePaths }),
        );
        const cleanedApplications: Openable[] = apps.map((app) => ({
          id: app.bundleId!,
          name: app.path.split("/").pop()!.replace(".app", ""), // Use the custom name of the app based on name of '.app' file
          path: app.path,
          running: runningApps.has(app.name) && !preferences.appsWithoutRunningCheck.includes(app.bundleId!),
          icon: imagePaths[app.bundleId!].custom ?? imagePaths[app.bundleId!].default,
          type: "app",
        }));
        const cleanedWebsites: Openable[] = parsedWebsites.map((website) => ({
          ...website,
          icon: imagePaths[website.id]?.custom ?? imagePaths[website.id]?.default ?? website.icon,
          type: "website",
        }));
        const cleanedDirectories: Openable[] = parsedDirectories.map((directory) => ({
          ...directory,
          icon: imagePaths[directory.id]?.custom ?? imagePaths[directory.id]?.default ?? directory.icon,
          type: "directory",
        }));

        setApplications(cleanedApplications);
        setWebsites(cleanedWebsites);
        setDirectories(cleanedDirectories);
      } catch (error) {
        console.error("Error fetching applications:", error);
      }

      setIsLoading(false);
    }

    initApp();
  }, []);

  function passesSearchFilter(app: Openable): { passes: boolean; score: number } {
    if (!searchText) return { passes: true, score: 1 };

    const options = {
      includeScore: true,
      threshold: fuzzySearchThreshold,
      keys: [
        { name: "name", weight: 0.3 },
        { name: "customName", weight: 0.7 },
      ],
    };

    // Split search text and app name into words
    const searchWords = searchText
      .toLowerCase()
      .split(" ")
      .filter((word) => word !== "");
    const appNameWords = app.name
      .toLowerCase()
      .split(" ")
      .filter((word) => word !== "");
    const customNameWords = (preferences.customNames[app.id] || "")
      .toLowerCase()
      .split(" ")
      .filter((word) => word !== "");

    // Create a Fuse instance for each target word
    let totalScore = 0;
    let matchedWords = 0;

    for (const searchWord of searchWords) {
      let bestWordScore = 0;

      // Check against each word in the app name
      for (const targetWord of [...appNameWords, ...customNameWords]) {
        const fuse = new Fuse([{ word: targetWord }], {
          ...options,
          keys: ["word"],
        });

        const result = fuse.search(searchWord);
        if (result.length > 0) {
          const wordScore = 1 - (result[0]!.score ?? 1);
          bestWordScore = Math.max(bestWordScore, wordScore);
        }
      }

      if (bestWordScore > 0) {
        totalScore += bestWordScore;
        matchedWords++;
      }
    }

    const finalScore = matchedWords > 0 ? totalScore / searchWords.length : 0;

    return {
      passes:
        searchText.includes(" ") && !app.name.includes(" ") && !preferences.customNames[app.id]?.includes(" ")
          ? false
          : matchedWords === searchWords.length, // All search words must match
      score: finalScore,
    };
  }

  function calcFrecencyValue(appId: string) {
    const now = new Date();
    return (
      hitHistory[appId]?.reduce((total, timestamp) => {
        const millisecondsToHours = 3600000;
        return (
          total +
          Math.exp(-lambdaDecay * ((now.getTime() - new Date(timestamp).getTime()) / millisecondsToHours / timeScale))
        );
      }, 0) ?? 0
    );
  }

  function sortFunction(a: Openable, b: Openable) {
    if (preferences.prioritizeRunningApps && a.running !== b.running) {
      return a.running ? -1 : 1;
    }

    switch (sortType) {
      case "frecency": {
        const diff =
          0.8 * (calcFrecencyValue(b.id) - calcFrecencyValue(a.id)) +
          0.2 * (passesSearchFilter(b).score - passesSearchFilter(a).score);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      case "alphabetical":
        return a.name.localeCompare(b.name);
      case "custom":
        return a.name.localeCompare(b.name);
    }
  }

  async function toggle(type: ToggleableAppPreferences, bundleId: string) {
    const newPreferences = { ...preferences };
    switch (type) {
      case "pinnedApps":
        if (newPreferences.pinnedApps.includes(bundleId)) {
          newPreferences.pinnedApps = newPreferences.pinnedApps.filter((id) => id !== bundleId);
        } else {
          newPreferences.pinnedApps.push(bundleId);
        }
        break;
      case "hidden":
        if (newPreferences.hidden.includes(bundleId)) {
          newPreferences.hidden = newPreferences.hidden.filter((id) => id !== bundleId);
        } else {
          newPreferences.hidden.push(bundleId);
        }
        break;
      case "appsWithoutRunningCheck":
        if (newPreferences.appsWithoutRunningCheck.includes(bundleId)) {
          newPreferences.appsWithoutRunningCheck = newPreferences.appsWithoutRunningCheck.filter(
            (id) => id !== bundleId,
          );
          setAppRunningStatus(applications.find((app) => app.id === bundleId)!, true);
        } else {
          newPreferences.appsWithoutRunningCheck.push(bundleId);
          setAppRunningStatus(applications.find((app) => app.id === bundleId)!, false);
        }
        break;
      case "prioritizeRunningApps":
        newPreferences.prioritizeRunningApps = !newPreferences.prioritizeRunningApps;
        break;
      case "showHidden":
        newPreferences.showHidden = !newPreferences.showHidden;
        break;
    }
    setPreferences(newPreferences);
    await LocalStorage.setItem("appPreferences", JSON.stringify(newPreferences));
  }

  function getOpeners(app: Openable) {
    return getApplications(app.path).then((apps) => {
      return apps;
    });
  }

  function setAppRunningStatus(app: Openable, running: boolean) {
    const newApplications: Openable[] = applications.map((a) => {
      if (a.id === app.id) {
        return { ...a, running: running };
      }
      return a;
    });
    setApplications(newApplications);
  }

  function incrementFrecency(app: Openable) {
    const newHitHistory = { ...hitHistory };
    newHitHistory[app.id] = (newHitHistory[app.id] ?? []).concat([new Date().toISOString()]);
    setHitHistory(newHitHistory);
    LocalStorage.setItem("hitHistory", JSON.stringify(newHitHistory));
  }

  const AppItem = ({ app }: { app: Openable }) => {
    const Accessories: List.Item.Accessory[] = [
      ...Object.keys(preferences.appTags[app.id] ?? {}).map((tag) => ({
        tag: {
          value: tag,
          color: Color.Blue,
        },
        tooltip: tag,
      })),
      // TODO: Add custom tags for searching
      {
        icon:
          app.type === "website" && settings.showIdentifierForWebsitesAndDirectories
            ? { source: Icon.Globe, tintColor: Color.SecondaryText }
            : undefined,
        tooltip: app.type === "website" ? "Website" : undefined,
      },
      {
        icon:
          app.type === "directory" && settings.showIdentifierForWebsitesAndDirectories
            ? { source: Icon.Folder, tintColor: Color.Blue }
            : undefined,
        tooltip: app.type === "directory" ? "File" : undefined,
      },
      {
        icon: preferences.hidden.includes(app.id) && settings.showEyeIconForHiddenApps ? Icon.EyeDisabled : undefined,
        tooltip: preferences.hidden.includes(app.id) ? "Hidden" : undefined,
      },
      {
        icon: preferences.pinnedApps.includes(app.id) && settings.showPinIconForPinnedApps ? Icon.Tack : undefined,
        tooltip: preferences.pinnedApps.includes(app.id) ? "Pinned" : undefined,
      },
      {
        icon:
          app.running && !settings.fastMode && settings.showBoltIconForRunningApps
            ? { source: Icon.Bolt, tintColor: Color.Green }
            : undefined,
        tooltip: app.running ? "Running" : "Not Running",
      },
    ];

    const title = preferences.customNames[app.id] || app.name;
    const subtitle = title === app.name ? "" : app.name;
    const getPrimaryActionTitle = () => {
      if (app.type === "directory" && preferences.customDirectoryOpeners[app.id]) {
        const a = preferences.customDirectoryOpeners[app.id];
        return `Open with ${a}`;
      }
      if (app.running) {
        return `Switch to tab`;
      }
      if (app.type === "app") {
        return `Open app`;
      }
      return `Open in browser`;
    };

    const a = preferences.cachedIconDirectories[app.id]?.custom || app.icon;
    const iconString = typeof a === "object" ? ("fileIcon" in a ? a.fileIcon.toString() : a.source.toString()) : a;

    return (
      <List.Item
        icon={!settings.fastMode ? app.icon : undefined}
        title={title}
        subtitle={subtitle}
        accessories={Accessories}
        quickLook={{ path: app.path, name: title }}
        actions={
          <ActionPanel>
            <Action.Open
              title={getPrimaryActionTitle()}
              target={app.path}
              application={
                app.type === "directory" && preferences.customDirectoryOpeners[app.id]
                  ? preferences.customDirectoryOpeners[app.id]
                  : "default"
              }
              icon={Icon.AppWindow}
              onOpen={() => {
                setAppRunningStatus(app, true);
                incrementFrecency(app);
              }}
            />
            {app.running && (
              <Action
                title={`Close ${app.type}`}
                icon={Icon.XMarkCircle}
                onAction={async () => {
                  setAppRunningStatus(app, false);
                  try {
                    setIsLoading(true);
                    await runTerminalCommand(`osascript -e 'tell application "${app.name}" to quit'`);
                    setIsLoading(false);
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: `Failed to close ${app.type}`,
                      message: String(error),
                    });
                  }
                }}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            )}
            <ActionPanel.Submenu title={"App Specific"} icon={Icon.CircleEllipsis}>
              <Action
                title={preferences.pinnedApps.includes(app.id) ? "Unpin" : "Pin"}
                icon={preferences.pinnedApps.includes(app.id) ? Icon.PinDisabled : Icon.Pin}
                onAction={() => toggle("pinnedApps", app.id)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
              {!preferences.pinnedApps.includes(app.id) && (
                <Action
                  title={preferences.hidden.includes(app.id) ? "Un-hide" : "Hide"}
                  icon={preferences.hidden.includes(app.id) ? Icon.Eye : Icon.EyeDisabled}
                  onAction={() => toggle("hidden", app.id)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                />
              )}
              {preferences.cachedIconDirectories[app.id]?.custom && (
                <Action
                  title="Remove Custom Icon"
                  icon={Icon.Trash}
                  onAction={async () => {
                    console.log("App", preferences.cachedIconDirectories[app.id]);
                    const newPreferences = { ...preferences };
                    newPreferences.cachedIconDirectories[app.id] = {
                      default: newPreferences.cachedIconDirectories[app.id].default,
                      custom: null,
                    };
                    app.icon = newPreferences.cachedIconDirectories[app.id].default;
                    setPreferences(newPreferences);
                    await LocalStorage.setItem("appPreferences", JSON.stringify(newPreferences));
                  }}
                />
              )}
              {!settings.fastMode && app.type === "app" && (
                <Action
                  title={
                    preferences.appsWithoutRunningCheck.includes(app.id)
                      ? "Check Running Status"
                      : "Ignore Running Status"
                  }
                  icon={preferences.appsWithoutRunningCheck.includes(app.id) ? Icon.Bolt : Icon.BoltDisabled}
                  onAction={() => toggle("appsWithoutRunningCheck", app.id)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                />
              )}
              {preferences.customNames[app.id] && (
                <Action
                  title="Remove Custom Name"
                  icon={Icon.XMarkCircle}
                  onAction={async () => {
                    const newPreferences = { ...preferences };
                    delete newPreferences.customNames[app.id];
                    setPreferences(newPreferences);
                    await LocalStorage.setItem("appPreferences", JSON.stringify(newPreferences));
                    showToast({
                      style: Toast.Style.Success,
                      title: "Custom name for " + app.name + " removed",
                    });
                  }}
                />
              )}
              {app.type === "directory" && (
                <Action.ToggleQuickLook title="Open Directory" icon={Icon.MagnifyingGlass} />
              )}
              {app.type !== "app" && (
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Are you sure?",
                        message: `This will delete the ${app.type} from the list of things you can open and reset the frecency value.`,
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                        },
                      })
                    ) {
                      if (app.type === "website") {
                        const newWebsites = websites.filter((website) => website.id !== app.id);
                        setWebsites(newWebsites);
                        LocalStorage.setItem("websites", JSON.stringify(newWebsites));
                      } else {
                        const newDirectories = directories.filter((directory) => directory.id !== app.id);
                        setDirectories(newDirectories);
                        LocalStorage.setItem("directories", JSON.stringify(newDirectories));
                      }
                      for (const option of Object.keys(preferences)) {
                        const key = option as keyof AppPreferences;
                        if (Array.isArray(preferences[key])) {
                          (preferences[key] as string[]) = (preferences[key] as string[]).filter((id) => id !== app.id);
                        } else if (typeof preferences[key] === "object" && preferences[key] !== null) {
                          delete (preferences[key] as Record<string, unknown>)[app.id];
                        }
                      }
                      setPreferences(preferences);
                      await LocalStorage.setItem("appPreferences", JSON.stringify(preferences));
                      showToast({
                        style: Toast.Style.Success,
                        title: `"${app.name}" has been deleted!`,
                      });
                    }
                  }}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              )}
              {app.type === "app" && (
                <Action
                  title="Refresh App Icon"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={async () => {
                    setIsLoading(true);
                    const newIconPath = await asyncGetAppIcon({
                      appPath: app.path,
                      appName: app.name,
                      checkCache: false,
                    });
                    const newPreferences = preferences;
                    newPreferences.cachedIconDirectories[app.id] = {
                      default: newIconPath,
                      custom: newPreferences.cachedIconDirectories[app.id].custom,
                    };
                    setPreferences(newPreferences);
                    app.icon = newIconPath;
                    await LocalStorage.setItem("appPreferences", JSON.stringify(newPreferences));
                    setIsLoading(false);
                  }}
                />
              )}
            </ActionPanel.Submenu>
            <Action
              title="Edit"
              icon={Icon.Pencil}
              onAction={() =>
                push(
                  <EditOpenable
                    startCondition={{
                      ...app,
                      icon: iconString,
                      name: preferences.customNames[app.id] || app.name,
                    }}
                    gatherOpeners={() => getOpeners(app)}
                    defaultOpener={preferences.customDirectoryOpeners[app.id] ?? "Finder"}
                    onSave={async (changedValues) => {
                      if (changedValues.name) {
                        if (app.type === "app") {
                          preferences.customNames[app.id] = changedValues.name;
                          app.name = changedValues.name;
                          setPreferences(preferences);
                          await LocalStorage.setItem("appPreferences", JSON.stringify(preferences));
                        } else {
                          if (app.type === "website") {
                            websites.find((website) => website.id === app.id)!.name = changedValues.name;
                            setWebsites(websites);
                            await LocalStorage.setItem("websites", JSON.stringify(websites));
                          } else {
                            directories.find((directory) => directory.id === app.id)!.name = changedValues.name;
                            setDirectories(directories);
                            await LocalStorage.setItem("directories", JSON.stringify(directories));
                          }
                        }
                      }
                      if (changedValues.icon) {
                        const newPreferences = { ...preferences };
                        if (!newPreferences.cachedIconDirectories[app.id]) {
                          newPreferences.cachedIconDirectories[app.id] = {
                            default: app.icon,
                            custom: null,
                          };
                        }
                        newPreferences.cachedIconDirectories[app.id].custom = changedValues.icon;
                        setPreferences(newPreferences);
                        app.icon = changedValues.icon;
                        await LocalStorage.setItem("appPreferences", JSON.stringify(newPreferences));
                      }
                      if (changedValues.opener) {
                        const newPreferences = { ...preferences };
                        newPreferences.customDirectoryOpeners[app.id] = changedValues.opener;
                        setPreferences(newPreferences);
                        await LocalStorage.setItem("appPreferences", JSON.stringify(newPreferences));
                      }
                    }}
                  />,
                )
              }
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <ActionPanel.Section title={"General"}>
              <Action
                title="Add Website / File Directory"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <NewOpenable
                      onSave={async (name, path, type, opener) => {
                        let icon: Image.ImageLike;
                        if (type === "website") {
                          const result = await fetch(path + "/favicon.ico").catch(() => ({ ok: false }));
                          icon = result.ok ? path + "/favicon.ico" : Icon.Globe;
                        } else {
                          icon = Icon.Folder;
                        }
                        const soonToBeOpenables: Openable[] = [
                          ...(type === "website" ? websites : directories),
                          {
                            id: path,
                            name: name,
                            path: path,
                            running: false,
                            icon: icon,
                            type: type,
                          },
                        ];
                        if (opener) {
                          const newPreferences = { ...preferences };
                          newPreferences.customDirectoryOpeners[path] = opener;
                          setPreferences(newPreferences);
                          await LocalStorage.setItem("appPreferences", JSON.stringify(newPreferences));
                        }
                        if (type === "website") {
                          setWebsites(soonToBeOpenables);
                          await LocalStorage.setItem("websites", JSON.stringify(soonToBeOpenables));
                        } else {
                          setDirectories(soonToBeOpenables);
                          await LocalStorage.setItem("directories", JSON.stringify(soonToBeOpenables));
                        }
                      }}
                    />,
                  )
                }
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title={preferences.showHidden ? "Don't Show Hidden Apps" : "Show All Hidden Apps"}
                icon={preferences.showHidden ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => toggle("showHidden", app.id)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              />
              {!settings.fastMode && (
                <Action
                  title={
                    preferences.prioritizeRunningApps ? "Don't Prioritize Running Apps" : "Prioritize Running Apps"
                  }
                  icon={Icon.ChevronUpDown}
                  onAction={() => toggle("prioritizeRunningApps", app.id)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title={"Destructive"}>
              <Action
                title="Reset Frecency Values"
                icon={Icon.Clock}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Are you sure?",
                      message:
                        "This will reset all frecency values which will affect the sorting of apps. This cannot be undone.",
                      primaryAction: {
                        title: "Reset",
                        style: Alert.ActionStyle.Destructive,
                      },
                      dismissAction: {
                        title: "Cancel",
                        style: Alert.ActionStyle.Cancel,
                      },
                    })
                  ) {
                    setHitHistory({});
                    LocalStorage.setItem("hitHistory", JSON.stringify({}));
                    showToast({
                      style: Toast.Style.Success,
                      title: "Frecency values reset",
                    });
                  }
                }}
              />
              <Action
                title="Clear Icon Cache"
                icon={Icon.Trash}
                onAction={() => {
                  LocalStorage.setItem("appPreferences", JSON.stringify({ ...preferences, cachedIconDirectories: {} }));
                  setPreferences({ ...preferences, cachedIconDirectories: {} });
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for the app you want to open"
      searchBarAccessory={
        settings.showSortOptions ? (
          <List.Dropdown
            tooltip="Sort by"
            onChange={(value) => {
              const newSortType = value as "frecency" | "alphabetical" | "custom";
              setSortType(newSortType);
              LocalStorage.setItem("sortType", newSortType);
            }}
          >
            <List.Dropdown.Item title="Frecency" value="frecency" icon={Icon.Clock} />
            <List.Dropdown.Item title="Alphabetical" value="alphabetical" icon={Icon.Text} />
          </List.Dropdown>
        ) : null
      }
    >
      <List.Section title="Pinned Apps">
        {pins.map((app) => (
          <AppItem key={app.id} app={app} />
        ))}
      </List.Section>

      <List.Section title="All Apps">
        {regular.map((app) => (
          <AppItem key={app.id} app={app} />
        ))}
      </List.Section>

      {preferences.showHidden && (
        <List.Section title="Hidden Apps">
          {hidden.map((app) => (
            <AppItem key={app.id} app={app} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// onAction={() => {
//   for (const option of Object.keys(preferences)) {
//     const key = option as keyof AppPreferences;
//     if (
//       Array.isArray(preferences[key]) &&
//       (preferences[key] as string[]).length > 0 &&
//       (preferences[key] as string[]).includes(app.id)
//     ) {
//       console.log(
//         "Preference (",
//         key,
//         ")",
//         (preferences[key] as string[]).find((id) => id === app.id),
//       );
//     } else if (
//       typeof preferences[key] === "object" &&
//       preferences[key] !== null &&
//       Object.keys(preferences[key]).includes(app.id)
//     ) {
//       console.log("Preference (", key, ")", (preferences[key] as Record<string, unknown>)[app.id]);
//     }
//   }
// }}
