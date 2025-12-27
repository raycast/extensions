import { useState, useEffect } from "react";
import { getApplications } from "@raycast/api";
import { AppInfo } from "../types";

// ============================================
// Supported IDEs (whitelist)
// ============================================

const SUPPORTED_IDES: { bundleId: string; name: string }[] = [
  // Cursor
  { bundleId: "com.todesktop.230313mzl4w4u92", name: "Cursor" },

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
// useApplications Hook
// ============================================

interface UseApplicationsReturn {
  applications: AppInfo[];
  isLoading: boolean;
}

export function useApplications(): UseApplicationsReturn {
  const [applications, setApplications] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadApplications() {
      setIsLoading(true);
      try {
        const installedApps = await getApplications();
        const installedBundleIds = new Set(installedApps.map((app) => app.bundleId).filter(Boolean));

        // Filter: only show supported IDEs that are installed
        const availableIDEs = SUPPORTED_IDES.filter((ide) => installedBundleIds.has(ide.bundleId));

        // Get full app info (path)
        const appInfos: AppInfo[] = availableIDEs.map((ide) => {
          const installedApp = installedApps.find((app) => app.bundleId === ide.bundleId);
          return {
            name: ide.name,
            bundleId: ide.bundleId,
            path: installedApp?.path || "",
          };
        });

        setApplications(appInfos);
      } catch (error) {
        console.error("Failed to load applications:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadApplications();
  }, []);

  return { applications, isLoading };
}

// ============================================
// Supported Terminals (whitelist)
// ============================================

const SUPPORTED_TERMINALS: { bundleId: string; name: string }[] = [
  // macOS built-in
  { bundleId: "com.apple.Terminal", name: "Terminal" },

  // Popular terminals (cross-platform)
  { bundleId: "com.googlecode.iterm2", name: "iTerm" },
  { bundleId: "dev.warp.Warp-Stable", name: "Warp" },
  { bundleId: "com.github.wez.wezterm", name: "WezTerm" },
  { bundleId: "net.kovidgoyal.kitty", name: "Kitty" },
  { bundleId: "co.zeit.hyper", name: "Hyper" },
  { bundleId: "com.mitchellh.ghostty", name: "Ghostty" },
  { bundleId: "io.alacritty", name: "Alacritty" },
  { bundleId: "com.panic.Prompt3", name: "Prompt" },

  // Windows terminals
  { bundleId: "Microsoft.WindowsTerminal", name: "Windows Terminal" },
  { bundleId: "Microsoft.WindowsTerminal.Preview", name: "Windows Terminal Preview" },
  { bundleId: "Microsoft.PowerShell", name: "PowerShell" },
  { bundleId: "Microsoft.Cmd", name: "Command Prompt" },
];

// ============================================
// useTerminals Hook
// ============================================

interface UseTerminalsReturn {
  terminals: AppInfo[];
  isLoading: boolean;
}

export function useTerminals(): UseTerminalsReturn {
  const [terminals, setTerminals] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTerminals() {
      setIsLoading(true);
      try {
        const installedApps = await getApplications();
        const installedBundleIds = new Set(installedApps.map((app) => app.bundleId).filter(Boolean));

        // Filter: only show supported terminals that are installed
        const availableTerminals = SUPPORTED_TERMINALS.filter((terminal) => installedBundleIds.has(terminal.bundleId));

        // Get full app info (path)
        const appInfos: AppInfo[] = availableTerminals.map((terminal) => {
          const installedApp = installedApps.find((app) => app.bundleId === terminal.bundleId);
          return {
            name: terminal.name,
            bundleId: terminal.bundleId,
            path: installedApp?.path || "",
          };
        });

        setTerminals(appInfos);
      } catch (error) {
        console.error("Failed to load terminals:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadTerminals();
  }, []);

  return { terminals, isLoading };
}
