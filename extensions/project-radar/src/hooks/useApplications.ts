import { getApplications } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AppInfo } from "../types";

// ============================================
// Supported IDEs (whitelist)
// ============================================

const SUPPORTED_IDES: { bundleId: string; name: string }[] = [
  // Cursor
  { bundleId: "com.todesktop.230313mzl4w4u92", name: "Cursor" },

  // Windsurf (Codeium)
  { bundleId: "com.exafunction.windsurf", name: "Windsurf" },

  // Trae (ByteDance)
  { bundleId: "com.trae.app", name: "Trae" },

  // VS Code
  { bundleId: "com.microsoft.VSCode", name: "Visual Studio Code" },
  { bundleId: "com.microsoft.VSCodeInsiders", name: "VS Code Insiders" },

  // JetBrains
  { bundleId: "com.jetbrains.WebStorm", name: "WebStorm" },
  { bundleId: "com.jetbrains.intellij", name: "IntelliJ IDEA" },
  { bundleId: "com.jetbrains.intellij.ce", name: "IntelliJ IDEA CE" },
  { bundleId: "com.jetbrains.pycharm", name: "PyCharm" },
  { bundleId: "com.jetbrains.pycharm.ce", name: "PyCharm CE" },
  { bundleId: "com.jetbrains.phpstorm", name: "PhpStorm" },
  { bundleId: "com.jetbrains.rubymine", name: "RubyMine" },
  { bundleId: "com.jetbrains.goland", name: "GoLand" },
  { bundleId: "com.jetbrains.rider", name: "Rider" },
  { bundleId: "com.jetbrains.clion", name: "CLion" },
  { bundleId: "com.jetbrains.datagrip", name: "DataGrip" },
  { bundleId: "com.jetbrains.fleet", name: "Fleet" },

  // Apple
  { bundleId: "com.apple.dt.Xcode", name: "Xcode" },

  // Other IDEs
  { bundleId: "com.google.android.studio", name: "Android Studio" },
  { bundleId: "dev.zed.Zed", name: "Zed" },
  { bundleId: "com.sublimetext.4", name: "Sublime Text" },
  { bundleId: "com.sublimetext.3", name: "Sublime Text 3" },
  { bundleId: "com.github.atom", name: "Atom" },
  { bundleId: "com.panic.Nova", name: "Nova" },
  { bundleId: "com.barebones.bbedit", name: "BBEdit" },
  { bundleId: "com.macromates.TextMate", name: "TextMate" },
  { bundleId: "org.vim.MacVim", name: "MacVim" },
  { bundleId: "com.qvacua.VimR", name: "VimR" },
];

// ============================================
// Supported Terminals (whitelist)
// ============================================

const SUPPORTED_TERMINALS: { bundleId: string; name: string }[] = [
  // macOS built-in
  { bundleId: "com.apple.Terminal", name: "Terminal" },

  // Popular terminals
  { bundleId: "com.googlecode.iterm2", name: "iTerm" },
  { bundleId: "dev.warp.Warp-Stable", name: "Warp" },
  { bundleId: "com.github.wez.wezterm", name: "WezTerm" },
  { bundleId: "net.kovidgoyal.kitty", name: "Kitty" },
  { bundleId: "co.zeit.hyper", name: "Hyper" },
  { bundleId: "com.mitchellh.ghostty", name: "Ghostty" },
  { bundleId: "io.alacritty", name: "Alacritty" },
  { bundleId: "com.panic.Prompt3", name: "Prompt" },
];

// ============================================
// Fetch and Filter Applications
// ============================================

async function fetchFilteredApps(supportedApps: { bundleId: string; name: string }[]): Promise<AppInfo[]> {
  const installedApps = await getApplications();
  // Use Map for O(1) lookup instead of find() which is O(n)
  const installedAppsMap = new Map(installedApps.filter((app) => app.bundleId).map((app) => [app.bundleId, app]));

  return supportedApps
    .filter((app) => installedAppsMap.has(app.bundleId))
    .map((app) => {
      const installedApp = installedAppsMap.get(app.bundleId);
      return {
        name: app.name,
        bundleId: app.bundleId,
        path: installedApp?.path || "",
      };
    });
}

// Stable function references for useCachedPromise
async function fetchIDEs(): Promise<AppInfo[]> {
  return fetchFilteredApps(SUPPORTED_IDES);
}

async function fetchTerminals(): Promise<AppInfo[]> {
  return fetchFilteredApps(SUPPORTED_TERMINALS);
}

// ============================================
// Public Hooks
// ============================================

interface UseApplicationsReturn {
  applications: AppInfo[];
  isLoading: boolean;
  refresh: () => void;
}

export function useApplications(): UseApplicationsReturn {
  const { data, isLoading, revalidate } = useCachedPromise(fetchIDEs, [], {
    keepPreviousData: true,
  });

  return {
    applications: data ?? [],
    isLoading,
    refresh: revalidate,
  };
}

interface UseTerminalsReturn {
  terminals: AppInfo[];
  isLoading: boolean;
  refresh: () => void;
}

export function useTerminals(): UseTerminalsReturn {
  const { data, isLoading, revalidate } = useCachedPromise(fetchTerminals, [], {
    keepPreviousData: true,
  });

  return {
    terminals: data ?? [],
    isLoading,
    refresh: revalidate,
  };
}
