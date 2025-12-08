import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  closeMainWindow,
  environment,
  LocalStorage,
  showToast,
  useNavigation,
} from "@raycast/api";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";

interface ColorOption {
  title: string;
  hex: string;
  hex2?: string;
  keywords?: string[];
  id?: string;
  favorite?: boolean;
  lastUsed?: number;
  createdAt?: number;
}

type CustomColorSubmitHandler = (color: ColorOption, options?: { persist?: boolean; launch?: boolean }) => void;

function createGradientIcon(primary: string, secondary?: string) {
  const fallback = secondary ?? primary;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="64" height="40" viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="${primary}" />
      <stop offset="100%" stop-color="${fallback}" />
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="62" height="38" rx="8" fill="url(#gradient)" stroke="rgba(0,0,0,0.1)" stroke-width="2" />
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type QuickInput =
  | { kind: "solid"; primary: string; secondary?: undefined }
  | { kind: "gradient"; primary: string; secondary: string };

type ColorTypeFilter = "all" | "solid" | "gradient" | "custom" | "favorite";

type ColorOrigin = "custom" | "preset" | "adhoc";

interface RecentColorEntry {
  id?: string;
  title: string;
  hex: string;
  hex2?: string;
  origin: ColorOrigin;
  lastUsed: number;
}

const PRESET_COLORS: ColorOption[] = [
  { title: "Black", hex: "#000000", keywords: ["black"] },
  { title: "White", hex: "#FFFFFF", keywords: ["white"] },
  { title: "Red", hex: "#FF3B30", keywords: ["red"] },
  { title: "Green", hex: "#34C759", keywords: ["green"] },
  { title: "Blue", hex: "#007AFF", keywords: ["blue"] },
  { title: "Yellow", hex: "#FFCC00", keywords: ["yellow"] },
  { title: "Purple", hex: "#AF52DE", keywords: ["purple"] },
  { title: "Orange", hex: "#FF9500", keywords: ["orange"] },
  { title: "Gray", hex: "#8E8E93", keywords: ["gray", "grey"] },
  { title: "Pink", hex: "#FF2D55", keywords: ["pink"] },
  { title: "Cyan", hex: "#64D4FF", keywords: ["cyan", "aqua"] },
  { title: "Sky Blue", hex: "#5AC8FA", keywords: ["sky", "light blue"] },
  { title: "Mint Green", hex: "#66D4CF", keywords: ["mint", "mint green"] },
  { title: "Brown", hex: "#A2845E", keywords: ["brown"] },
];

const PRESET_GRADIENTS: ColorOption[] = [
  { title: "Blue to Purple", hex: "#4A90E2", hex2: "#9013FE" },
  { title: "Sunset Ember", hex: "#FF512F", hex2: "#F09819" },
  { title: "Fresh Greens", hex: "#11998E", hex2: "#38EF7D" },
  { title: "Dreamy Pink", hex: "#FF9A9E", hex2: "#FAD0C4" },
  { title: "Aurora Blue", hex: "#00C6FF", hex2: "#0072FF" },
  { title: "Soft Dawn", hex: "#FBC2EB", hex2: "#A6C1EE" },
  { title: "Coral Summer", hex: "#FF7E5F", hex2: "#FEB47B" },
  { title: "Forest Canopy", hex: "#A8E063", hex2: "#56AB2F" },
  { title: "Twilight Glow", hex: "#DA22FF", hex2: "#9733EE" },
  { title: "Sea Breeze", hex: "#1FA2FF", hex2: "#12D8FA" },
];

const CUSTOM_COLORS_KEY = "custom-colors";
const FAVORITE_PRESETS_KEY = "favorite-presets";
const RECENT_COLORS_KEY = "recent-colors";
const RECENT_COLOR_LIMIT = 8;

function createColorId() {
  try {
    return randomUUID();
  } catch {
    return `color-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function normalizeCustomColor(color: ColorOption) {
  const now = Date.now();
  return {
    ...color,
    id: color.id ?? createColorId(),
    favorite: Boolean(color.favorite),
    createdAt: color.createdAt ?? now,
    lastUsed: color.lastUsed ?? color.createdAt ?? now,
  };
}

function hydrateStoredColor(color: ColorOption, index: number) {
  const fallbackTimestamp = Date.now() - index;
  return normalizeCustomColor({
    ...color,
    createdAt: color.createdAt ?? fallbackTimestamp,
    lastUsed: color.lastUsed ?? color.createdAt ?? fallbackTimestamp,
  });
}

function sortCustomColors(colors: ColorOption[]) {
  return [...colors].sort((a, b) => {
    const favA = Number(Boolean(a.favorite));
    const favB = Number(Boolean(b.favorite));
    if (favA !== favB) {
      return favB - favA;
    }

    const lastA = a.lastUsed ?? a.createdAt ?? 0;
    const lastB = b.lastUsed ?? b.createdAt ?? 0;
    if (lastA !== lastB) {
      return lastB - lastA;
    }

    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}

function getPresetIdentifier(color: ColorOption) {
  const primary = color.hex.toUpperCase();
  const secondary = color.hex2?.toUpperCase();
  return secondary ? `${primary}-${secondary}` : primary;
}

function getRecentEntryIdentifier(color: ColorOption, origin: ColorOrigin) {
  if (origin === "custom" && color.id) {
    return color.id;
  }
  if (origin === "preset") {
    return getPresetIdentifier(color);
  }
  const primary = color.hex.toUpperCase();
  const secondary = color.hex2?.toUpperCase() ?? "SOLID";
  return `${origin}-${primary}-${secondary}`;
}

function recentEntryToColorOption(entry: RecentColorEntry): ColorOption {
  return {
    title: entry.title,
    hex: entry.hex,
    hex2: entry.hex2,
    id: entry.origin === "custom" ? entry.id : undefined,
  };
}

function isValidRecentEntry(value: unknown): value is RecentColorEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.title !== "string" || typeof candidate.hex !== "string") {
    return false;
  }
  if (candidate.hex2 != null && typeof candidate.hex2 !== "string") {
    return false;
  }
  if (candidate.id != null && typeof candidate.id !== "string") {
    return false;
  }
  if (typeof candidate.lastUsed !== "number") {
    return false;
  }
  if (candidate.origin !== "custom" && candidate.origin !== "preset" && candidate.origin !== "adhoc") {
    return false;
  }
  return true;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [colorType, setColorType] = useState<ColorTypeFilter>("all");
  const [customColors, setCustomColors] = useState<ColorOption[]>([]);
  const [isLoadingCustomColors, setIsLoadingCustomColors] = useState(true);
  const [favoritePresets, setFavoritePresets] = useState<Set<string>>(new Set());
  const [recentColors, setRecentColors] = useState<RecentColorEntry[]>([]);
  const [isLoadingRecentColors, setIsLoadingRecentColors] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await LocalStorage.getItem<string>(CUSTOM_COLORS_KEY);
        if (!mounted) {
          return;
        }
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const validColors = parsed.filter(isValidStoredColor);
          const normalized = validColors.map(hydrateStoredColor);
          const sorted = sortCustomColors(normalized);
          setCustomColors(sorted);
          void LocalStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(sorted));
        }
      } catch (error) {
        console.error("Failed to load custom colors", error);
      } finally {
        if (mounted) {
          setIsLoadingCustomColors(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await LocalStorage.getItem<string>(FAVORITE_PRESETS_KEY);
        if (!mounted) {
          return;
        }
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavoritePresets(new Set(parsed.filter((item): item is string => typeof item === "string")));
        }
      } catch (error) {
        console.error("Failed to load favorite presets", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await LocalStorage.getItem<string>(RECENT_COLORS_KEY);
        if (!mounted) {
          return;
        }
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const validEntries = parsed.filter(isValidRecentEntry);
          const sorted = validEntries.sort((a, b) => b.lastUsed - a.lastUsed).slice(0, RECENT_COLOR_LIMIT);
          setRecentColors(sorted);
        }
      } catch (error) {
        console.error("Failed to load recent colors", error);
      } finally {
        if (mounted) {
          setIsLoadingRecentColors(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const persistCustomColors = useCallback((colors: ColorOption[]) => {
    void LocalStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors));
  }, []);

  const persistFavoritePresetIds = useCallback((ids: Set<string>) => {
    void LocalStorage.setItem(FAVORITE_PRESETS_KEY, JSON.stringify(Array.from(ids)));
  }, []);

  const persistRecentColors = useCallback((entries: RecentColorEntry[]) => {
    void LocalStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(entries));
  }, []);

  const updateCustomColors = useCallback(
    (updater: (colors: ColorOption[]) => ColorOption[]) => {
      setCustomColors((previous) => {
        const next = sortCustomColors(updater(previous));
        persistCustomColors(next);
        return next;
      });
    },
    [persistCustomColors],
  );

  const addCustomColor = useCallback(
    (color: ColorOption) => {
      const normalized = normalizeCustomColor(color);
      updateCustomColors((previous) => {
        const filtered = previous.filter(
          (item) => item.id !== normalized.id && !(item.hex === normalized.hex && item.hex2 === normalized.hex2),
        );
        return [normalized, ...filtered];
      });
    },
    [updateCustomColors],
  );

  const removeCustomColor = useCallback(
    (target: ColorOption) => {
      updateCustomColors((previous) =>
        previous.filter((color) => (color.id && target.id ? color.id !== target.id : color !== target)),
      );
    },
    [updateCustomColors],
  );

  const updateExistingCustomColor = useCallback(
    (colorId: string, updates: Partial<ColorOption>) => {
      updateCustomColors((previous) =>
        previous.map((color) => {
          if (color.id !== colorId) {
            return color;
          }
          return normalizeCustomColor({
            ...color,
            ...updates,
            id: color.id,
            createdAt: color.createdAt,
            favorite: updates.favorite ?? color.favorite,
            lastUsed: updates.lastUsed ?? color.lastUsed,
          });
        }),
      );
    },
    [updateCustomColors],
  );

  const toggleFavorite = useCallback(
    (color: ColorOption) => {
      if (!color.id) {
        return;
      }
      updateExistingCustomColor(color.id, { favorite: !color.favorite });
    },
    [updateExistingCustomColor],
  );

  const markCustomColorUsed = useCallback(
    (colorId: string) => {
      updateExistingCustomColor(colorId, { lastUsed: Date.now() });
    },
    [updateExistingCustomColor],
  );

  const recordRecentColor = useCallback(
    (color: ColorOption, origin: ColorOrigin) => {
      const identifier = getRecentEntryIdentifier(color, origin);
      const entry: RecentColorEntry = {
        id: origin === "custom" ? (color.id ?? identifier) : identifier,
        title: color.title,
        hex: color.hex,
        hex2: color.hex2,
        origin,
        lastUsed: Date.now(),
      };
      setRecentColors((previous) => {
        const filtered = previous.filter((item) => item.id !== entry.id);
        const next = [entry, ...filtered].slice(0, RECENT_COLOR_LIMIT);
        persistRecentColors(next);
        return next;
      });
    },
    [persistRecentColors],
  );

  const handleShowColor = useCallback(
    async (color: ColorOption, options?: { trackUsage?: boolean; origin?: ColorOrigin }) => {
      await showColorOverlay(color);
      if (options?.trackUsage && color.id) {
        markCustomColorUsed(color.id);
      }
      if (options?.origin) {
        recordRecentColor(color, options.origin);
      }
    },
    [markCustomColorUsed, recordRecentColor],
  );

  const handleCustomColorSubmit: CustomColorSubmitHandler = useCallback(
    (color, { persist = true, launch = true } = {}) => {
      const prepared = normalizeCustomColor(color);
      if (persist) {
        addCustomColor(prepared);
      }
      if (launch) {
        void handleShowColor(prepared, {
          trackUsage: persist,
          origin: persist ? "custom" : "adhoc",
        });
      }
    },
    [addCustomColor, handleShowColor],
  );

  const togglePresetFavorite = useCallback(
    (color: ColorOption) => {
      const identifier = getPresetIdentifier(color);
      setFavoritePresets((previous) => {
        const next = new Set(previous);
        if (next.has(identifier)) {
          next.delete(identifier);
        } else {
          next.add(identifier);
        }
        persistFavoritePresetIds(next);
        return next;
      });
    },
    [persistFavoritePresetIds],
  );

  const quick = parseQuickInput(searchText);

  const filteredSolidColors = useMemo(
    () => PRESET_COLORS.filter((color) => matchesColor(color, searchText)),
    [searchText],
  );

  const filteredGradientColors = useMemo(
    () => PRESET_GRADIENTS.filter((color) => matchesColor(color, searchText)),
    [searchText],
  );

  const filteredCustomColors = useMemo(
    () => customColors.filter((color) => matchesColor(color, searchText)),
    [customColors, searchText],
  );

  const filteredRecentEntries = useMemo(
    () =>
      recentColors
        .filter((entry) => matchesColor(recentEntryToColorOption(entry), searchText))
        .slice(0, RECENT_COLOR_LIMIT),
    [recentColors, searchText],
  );

  const shouldShowCustomSection = useMemo(() => {
    if (!(colorType === "all" || colorType === "custom" || colorType === "favorite")) {
      return false;
    }
    if (isLoadingCustomColors) {
      return true;
    }
    return filteredCustomColors.some((color) => (colorType === "favorite" ? color.favorite : true));
  }, [colorType, filteredCustomColors, isLoadingCustomColors]);

  const shouldShowSolidSection = useMemo(() => {
    if (!(colorType === "all" || colorType === "solid" || colorType === "favorite")) {
      return false;
    }
    return filteredSolidColors.some((color) =>
      colorType === "favorite" ? favoritePresets.has(getPresetIdentifier(color)) : true,
    );
  }, [colorType, filteredSolidColors, favoritePresets]);

  const shouldShowGradientSection = useMemo(() => {
    if (!(colorType === "all" || colorType === "gradient" || colorType === "favorite")) {
      return false;
    }
    return filteredGradientColors.some((color) =>
      colorType === "favorite" ? favoritePresets.has(getPresetIdentifier(color)) : true,
    );
  }, [colorType, filteredGradientColors, favoritePresets]);

  const shouldShowRecentSection = useMemo(() => {
    if (colorType !== "all") {
      return false;
    }
    if (isLoadingRecentColors) {
      return true;
    }
    return filteredRecentEntries.length > 0;
  }, [colorType, filteredRecentEntries, isLoadingRecentColors]);

  const shouldShowQuick = useMemo(() => {
    if (!quick) {
      return false;
    }
    if (colorType === "all") {
      return true;
    }
    if (colorType === "solid" && quick.kind === "solid") {
      return true;
    }
    if (colorType === "gradient" && quick.kind === "gradient") {
      return true;
    }
    return false;
  }, [colorType, quick]);

  const customSubtitle =
    colorType === "gradient"
      ? "Enter HEX1,HEX2"
      : colorType === "solid"
        ? "Enter a single HEX"
        : "Enter HEX or HEX1,HEX2";

  return (
    <List
      searchBarPlaceholder="Search colors or enter HEX / HEX1,HEX2 (gradient)"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Color Type"
          storeValue
          value={colorType}
          onChange={(value) => setColorType(value as ColorTypeFilter)}
        >
          <List.Dropdown.Item title="All Types" value="all" />
          <List.Dropdown.Item title="Solid Colors" value="solid" />
          <List.Dropdown.Item title="Gradients" value="gradient" />
          <List.Dropdown.Section title="More">
            <List.Dropdown.Item title="Custom" value="custom" />
            <List.Dropdown.Item title="Favorites" value="favorite" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {shouldShowQuick && quick && (
        <List.Item
          title={quick.kind === "gradient" ? "Use entered gradient" : "Use entered color"}
          subtitle={quick.secondary ? `${quick.primary} → ${quick.secondary}` : quick.primary}
          icon={{ source: createGradientIcon(quick.primary, quick.secondary) }}
          actions={
            <ActionPanel>
              <Action
                title="Show Full Screen"
                icon={Icon.Monitor}
                onAction={() =>
                  void handleShowColor(
                    {
                      title: quick.secondary != null ? `${quick.primary} → ${quick.secondary}` : quick.primary,
                      hex: quick.primary,
                      hex2: quick.secondary,
                    },
                    { origin: "adhoc" },
                  )
                }
              />
            </ActionPanel>
          }
        />
      )}
      {shouldShowRecentSection && (
        <List.Section title="Recently Used" subtitle={isLoadingRecentColors ? "Loading" : undefined}>
          {isLoadingRecentColors ? (
            <List.Item title="Collecting recent entries" icon={Icon.Clock} />
          ) : (
            filteredRecentEntries.map((entry) => {
              const color = recentEntryToColorOption(entry);
              return (
                <List.Item
                  key={`${entry.origin}-${entry.id ?? entry.hex}-${entry.lastUsed}`}
                  title={entry.title}
                  subtitle={entry.hex2 ? `${entry.hex} → ${entry.hex2}` : entry.hex}
                  icon={
                    entry.hex2
                      ? { source: createGradientIcon(entry.hex, entry.hex2) }
                      : { source: createGradientIcon(entry.hex) }
                  }
                  accessories={
                    entry.origin === "custom"
                      ? [{ text: "Custom" }]
                      : entry.origin === "preset"
                        ? [{ text: "Preset" }]
                        : [{ text: "Ad hoc" }]
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Show Again"
                        icon={Icon.Monitor}
                        onAction={() =>
                          void handleShowColor(color, {
                            trackUsage: entry.origin === "custom",
                            origin: entry.origin,
                          })
                        }
                      />
                    </ActionPanel>
                  }
                />
              );
            })
          )}
        </List.Section>
      )}
      <List.Item
        title="Custom Color / Gradient"
        subtitle={customSubtitle}
        icon={Icon.Pencil}
        actions={<CustomColorAction onSubmit={handleCustomColorSubmit} />}
      />
      {shouldShowCustomSection && (
        <List.Section title="My Custom Colors" subtitle={isLoadingCustomColors ? "Loading" : undefined}>
          {isLoadingCustomColors ? (
            <List.Item title="Loading" icon={Icon.Hourglass} />
          ) : (
            filteredCustomColors
              .filter((color) => (colorType === "favorite" ? color.favorite : true))
              .map((color) => (
                <List.Item
                  key={color.id ?? `${color.title}-${color.hex}-${color.hex2 ?? "solid"}`}
                  title={color.title}
                  subtitle={color.hex2 ? `${color.hex} → ${color.hex2}` : color.hex}
                  keywords={[color.hex, ...(color.hex2 ? [color.hex2] : []), ...(color.keywords ?? [])]}
                  accessoryIcon={color.favorite ? Icon.Star : undefined}
                  icon={
                    color.hex2
                      ? { source: createGradientIcon(color.hex, color.hex2) }
                      : { source: createGradientIcon(color.hex) }
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Show Fullscreen Color"
                        icon={Icon.Monitor}
                        onAction={() =>
                          void handleShowColor(color, {
                            trackUsage: true,
                            origin: "custom",
                          })
                        }
                      />
                      <Action
                        title={color.favorite ? "Remove from Favorites" : "Favorite This Color"}
                        icon={Icon.Star}
                        onAction={() => toggleFavorite(color)}
                      />
                      <Action.Push
                        title="Edit This Color"
                        icon={Icon.Pencil}
                        target={
                          <CustomColorForm
                            mode="edit"
                            initialColor={color}
                            onSubmit={(updated) =>
                              handleCustomColorSubmit(updated, {
                                persist: true,
                                launch: false,
                              })
                            }
                          />
                        }
                      />
                      <Action
                        title="Delete This Custom Color"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => removeCustomColor(color)}
                      />
                    </ActionPanel>
                  }
                />
              ))
          )}
        </List.Section>
      )}
      {shouldShowSolidSection && (
        <List.Section title="Popular Solid Colors">
          {filteredSolidColors
            .filter((color) => (colorType === "favorite" ? favoritePresets.has(getPresetIdentifier(color)) : true))
            .map((color) => (
              <List.Item
                key={color.hex}
                title={color.title}
                subtitle={color.hex}
                keywords={[color.hex, ...(color.keywords ?? [])]}
                icon={{ source: createGradientIcon(color.hex) }}
                accessoryIcon={favoritePresets.has(getPresetIdentifier(color)) ? Icon.Star : undefined}
                actions={
                  <ColorActions
                    color={color}
                    onShow={(selected) => handleShowColor(selected, { origin: "preset" })}
                    extraActions={
                      <Action
                        title={
                          favoritePresets.has(getPresetIdentifier(color))
                            ? "Remove from Favorites"
                            : "Favorite This Color"
                        }
                        icon={Icon.Star}
                        onAction={() => togglePresetFavorite(color)}
                      />
                    }
                  />
                }
              />
            ))}
        </List.Section>
      )}
      {shouldShowGradientSection && (
        <List.Section title="Popular Gradients">
          {filteredGradientColors
            .filter((color) => (colorType === "favorite" ? favoritePresets.has(getPresetIdentifier(color)) : true))
            .map((color) => (
              <List.Item
                key={`${color.hex}-${color.hex2}`}
                title={color.title}
                subtitle={`${color.hex} → ${color.hex2}`}
                keywords={[color.hex, ...(color.hex2 ? [color.hex2] : []), ...(color.keywords ?? [])]}
                icon={color.hex2 ? { source: createGradientIcon(color.hex, color.hex2) } : Icon.Monitor}
                accessoryIcon={favoritePresets.has(getPresetIdentifier(color)) ? Icon.Star : undefined}
                actions={
                  <ColorActions
                    color={color}
                    onShow={(selected) => handleShowColor(selected, { origin: "preset" })}
                    extraActions={
                      <Action
                        title={
                          favoritePresets.has(getPresetIdentifier(color))
                            ? "Remove from Favorites"
                            : "Favorite This Color"
                        }
                        icon={Icon.Star}
                        onAction={() => togglePresetFavorite(color)}
                      />
                    }
                  />
                }
              />
            ))}
        </List.Section>
      )}
    </List>
  );
}

function ColorActions({
  color,
  onShow,
  extraActions,
}: {
  color: ColorOption;
  onShow?: (color: ColorOption) => Promise<void> | void;
  extraActions?: ReactNode;
}) {
  return (
    <ActionPanel>
      <Action
        title="Show Fullscreen Color"
        icon={Icon.Monitor}
        onAction={() => {
          if (onShow) {
            void onShow(color);
          } else {
            void showColorOverlay(color);
          }
        }}
      />
      {extraActions}
    </ActionPanel>
  );
}

function CustomColorAction({ onSubmit }: { onSubmit: CustomColorSubmitHandler }) {
  const { push } = useNavigation();
  return (
    <ActionPanel>
      <Action
        title="Enter a Custom Color"
        icon={Icon.Wand}
        onAction={() =>
          push(
            <CustomColorForm
              mode="create"
              onSubmit={(color, options) => {
                onSubmit(color, options);
              }}
            />,
          )
        }
      />
    </ActionPanel>
  );
}

function CustomColorForm({
  onSubmit,
  initialColor,
  mode = "create",
}: {
  onSubmit: CustomColorSubmitHandler;
  initialColor?: ColorOption;
  mode?: "create" | "edit";
}) {
  const { pop } = useNavigation();
  const isEditMode = mode === "edit";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditMode ? "Save Changes" : "Show Full Screen"}
            icon={Icon.Monitor}
            onSubmit={(values: { name?: string; hex: string; hex2?: string; persist?: boolean }) => {
              const normalized = normalizeHex(values.hex);
              if (!normalized) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Enter a valid primary HEX color",
                });
                return;
              }

              let normalized2: string | null = null;
              if (values.hex2 && values.hex2.trim().length > 0) {
                normalized2 = normalizeHex(values.hex2);
                if (!normalized2) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Secondary HEX color is invalid",
                  });
                  return;
                }
              }

              const title =
                values.name && values.name.trim().length > 0
                  ? values.name.trim()
                  : normalized2
                    ? `${normalized} → ${normalized2}`
                    : normalized;

              const shouldPersist = isEditMode ? true : (values.persist ?? true);
              const shouldLaunch = isEditMode ? false : true;
              onSubmit(
                {
                  ...initialColor,
                  title,
                  hex: normalized,
                  hex2: normalized2 ?? undefined,
                },
                { persist: shouldPersist, launch: shouldLaunch },
              );
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Color name"
        placeholder="Example: Brand blue"
        defaultValue={initialColor?.title}
      />
      <Form.TextField id="hex" title="HEX 1" placeholder="#FF0000" defaultValue={initialColor?.hex ?? "#"} autoFocus />
      <Form.TextField
        id="hex2"
        title="HEX 2 (optional for gradients)"
        placeholder="#00FF00"
        defaultValue={initialColor?.hex2}
      />
      {!isEditMode && <Form.Checkbox id="persist" label="Save to my custom colors" defaultValue />}
    </Form>
  );
}

async function showColorOverlay(color: ColorOption) {
  await closeMainWindow();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening full-screen color",
    message: color.title,
  });
  try {
    await launchColorOverlay(color.hex, color.hex2);
    toast.style = Toast.Style.Success;
    toast.title = "Color displayed";
    toast.message = "Press ESC or click to exit";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Launch failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}

function parseQuickInput(input: string): QuickInput | null {
  const raw = input.trim();
  if (!raw) {
    return null;
  }

  const normalizedText = raw.replace(/[，、]/g, ",");
  const parts = normalizedText.split(/[\s,]+/).filter((part) => part.length > 0);

  if (parts.length === 1) {
    const primary = normalizeHex(parts[0]);
    if (!primary) {
      return null;
    }
    return { kind: "solid" as const, primary };
  }

  const first = normalizeHex(parts[0]);
  const second = normalizeHex(parts[1]);
  if (!first || !second) {
    return null;
  }

  return { kind: "gradient" as const, primary: first, secondary: second };
}

function launchColorOverlay(hex: string, hex2?: string) {
  // Use a Swift script to show a system-level full-screen window with solid color
  return new Promise<void>((resolve, reject) => {
    const scriptPath = path.join(environment.assetsPath, "fullscreen_color.swift");
    if (!existsSync(scriptPath)) {
      reject(new Error("Full-screen script not found"));
      return;
    }

    const swiftExecutable = "/usr/bin/swift";
    if (!existsSync(swiftExecutable)) {
      reject(
        new Error(
          "Swift runtime not detected. Install Xcode Command Line Tools (xcode-select --install) or Xcode and try again.",
        ),
      );
      return;
    }

    const normalized = normalizeHex(hex);
    if (!normalized) {
      reject(new Error("Invalid HEX color"));
      return;
    }

    let normalized2: string | null = null;
    if (hex2 && hex2.trim().length > 0) {
      normalized2 = normalizeHex(hex2);
      if (!normalized2) {
        reject(new Error("Invalid secondary HEX color"));
        return;
      }
    }

    const args = [scriptPath, normalized, ...(normalized2 ? [normalized2] : [])];

    const child = spawn(swiftExecutable, args, {
      detached: true,
      stdio: "ignore",
    });

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.unref();
      resolve();
    }, 300);

    child.once("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.once("close", (code) => {
      if (settled) {
        return;
      }
      if (typeof code === "number" && code !== 0) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Swift script exited with code ${code}`));
      }
    });
  });
}

function normalizeHex(input: string) {
  if (!input) {
    return null;
  }

  let value = input.trim();
  if (value.startsWith("#")) {
    value = value.slice(1);
  }
  if (value.toLowerCase().startsWith("0x")) {
    value = value.slice(2);
  }

  if (value.length === 3 || value.length === 4) {
    value = value
      .split("")
      .map((char) => char.repeat(2))
      .join("");
  }

  if (value.length !== 6 && value.length !== 8) {
    return null;
  }

  if (!/^[0-9a-fA-F]+$/.test(value)) {
    return null;
  }

  return `#${value.toUpperCase()}`;
}

function isValidStoredColor(value: unknown): value is ColorOption {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.title !== "string" || typeof candidate.hex !== "string") {
    return false;
  }

  if (candidate.hex2 != null && typeof candidate.hex2 !== "string") {
    return false;
  }

  return true;
}

function matchesColor(color: ColorOption, query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }

  const candidates = [color.title, color.hex, color.hex2, ...(color.keywords ?? [])];

  return candidates.some((candidate) => candidate && fuzzyMatch(normalizeSearchValue(candidate), normalizedQuery));
}

function normalizeSearchValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.trim().toLowerCase().replace(/#/g, "");
}

function fuzzyMatch(target: string, pattern: string) {
  if (!pattern) {
    return true;
  }

  let patternIndex = 0;
  for (const char of target) {
    if (char === pattern[patternIndex]) {
      patternIndex += 1;
      if (patternIndex === pattern.length) {
        return true;
      }
    }
  }

  return false;
}
