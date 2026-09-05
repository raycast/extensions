import { useState, useEffect } from "react";
import { getFrontmostApplication, BrowserExtension, getApplications } from "@raycast/api";
import { getGitDiff } from "../utils/git-utils";
import { expandPath } from "../utils/path-alias-utils";
import { FINDER_SELECTION_MARKER } from "../utils/placeholder-formatter";
import { capturedFinderItemsPromise, capturedSelectedTextPromise, type FinderItems } from "../utils/captured-selection";
import * as fs from "fs";
import { startupElapsedMs, startupLog, startupNowMs } from "../utils/startup-profiler";

export function useInitialContext(initialSelectionText?: string, target?: string) {
  const [selectionText, setSelectionText] = useState(initialSelectionText ?? "");
  const [currentApp, setCurrentApp] = useState("");
  const [allApp, setAllApp] = useState("");
  const [browserContent, setBrowserContent] = useState("");
  const [diff, setDiff] = useState("");

  useEffect(() => {
    const processSelectedText = (text: string): string => {
      if (!text || !text.trim()) {
        return text;
      }

      const trimmedText = text.trim();

      if (trimmedText.startsWith("{{") && trimmedText.endsWith("}}")) {
        return text;
      }

      const lines = trimmedText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        return text;
      }

      const resolvedPaths: string[] = [];

      for (const line of lines) {
        if (line.startsWith("{{") && line.endsWith("}}")) {
          return text;
        }

        const expandedPath = expandPath(line);
        const candidates = expandedPath === line ? [expandedPath] : [expandedPath, line];

        let foundPath: string | null = null;
        for (const candidate of candidates) {
          try {
            fs.statSync(candidate);
            foundPath = candidate;
            break;
          } catch {
            continue;
          }
        }

        if (foundPath) {
          resolvedPaths.push(foundPath);
        } else {
          return text;
        }
      }

      return resolvedPaths.map((p) => `${FINDER_SELECTION_MARKER}{{file:${p}}}`).join("\n");
    };

    const fetchFrontmostApp = async (): Promise<string> => {
      const app = await getFrontmostApplication();
      return app.name;
    };

    const fetchBrowserContent = async (): Promise<string> => {
      try {
        const content = await BrowserExtension.getContent({ format: "markdown" });
        return content;
      } catch (error) {
        console.info("Failed to fetch browser content:", error);
        return "";
      }
    };

    const fetchAllApps = async (): Promise<string> => {
      try {
        const apps = await getApplications();
        return apps.map((app) => app.name).join(", ");
      } catch (error) {
        console.info("Failed to fetch all applications:", error);
        return "";
      }
    };

    let cancelled = false;

    const updateSelectedTextWhenReady = () => {
      void capturedSelectedTextPromise.then((lateSelectedText) => {
        if (cancelled || !lateSelectedText.trim()) return;

        const lateStarted = startupNowMs();
        const processedLateSelection = processSelectedText(lateSelectedText);
        if (cancelled) return;

        setSelectionText(processedLateSelection);
        startupLog("Initial context selected text late update", {
          durationMs: startupElapsedMs(lateStarted),
          selectionLength: processedLateSelection.length,
        });
      });
    };

    const fetchData = async () => {
      const started = startupNowMs();
      const frontmostStarted = startupNowMs();
      const fetchedFrontmostApp = await fetchFrontmostApp();
      if (cancelled) return;

      setCurrentApp(fetchedFrontmostApp);
      startupLog("Initial context frontmost app fetched", {
        durationMs: startupElapsedMs(frontmostStarted),
        frontmostApp: fetchedFrontmostApp,
      });

      const browserNames = [
        "Arc",
        "Safari",
        "Chrome",
        "Chromium",
        "Edge",
        "Brave",
        "Firefox",
        "Opera",
        "Vivaldi",
        "Orion",
        "Zen",
        "Dia",
        "DuckDuckGo",
      ];
      if (browserNames.some((browser) => fetchedFrontmostApp.includes(browser))) {
        void (async () => {
          const browserStarted = startupNowMs();
          const fetchedBrowserContent = await fetchBrowserContent();
          if (cancelled) return;

          setBrowserContent(fetchedBrowserContent);
          startupLog("Initial context browser fetched", {
            durationMs: startupElapsedMs(browserStarted),
            contentLength: fetchedBrowserContent.length,
          });
        })();
      }

      void (async () => {
        const appsStarted = startupNowMs();
        const fetchedAllApps = await fetchAllApps();
        if (cancelled) return;

        setAllApp(fetchedAllApps);
        startupLog("Initial context all apps fetched", {
          durationMs: startupElapsedMs(appsStarted),
          appCount: fetchedAllApps ? fetchedAllApps.split(", ").length : 0,
        });
      })();

      if (initialSelectionText && initialSelectionText.trim()) {
        const selectionStarted = startupNowMs();
        const rawInitial = initialSelectionText.trim();
        const processed = processSelectedText(rawInitial);

        let initialDiff = "";
        try {
          let pathCandidate: string | undefined;

          const match = processed.match(/\{\{file:([^}]+)\}\}/);
          if (match && match[1]) {
            pathCandidate = match[1];
          } else {
            try {
              fs.statSync(rawInitial);
              pathCandidate = rawInitial;
            } catch {
              // ignore
            }
          }

          if (pathCandidate) {
            initialDiff = await getGitDiff(pathCandidate);
          }
        } catch {
          // ignore
        }

        if (cancelled) return;
        setSelectionText(processed);
        setDiff(initialDiff);
        startupLog("Initial context ready", {
          durationMs: startupElapsedMs(started),
          selectionMs: startupElapsedMs(selectionStarted),
          selectionLength: processed.length,
          diffLength: initialDiff.length,
          source: "launch-argument",
        });
        return;
      }

      const selectionStarted = startupNowMs();
      let fetchedSelectedText = "";
      let fetchedDiff = "";
      try {
        let selectedItems: FinderItems = [];

        if (fetchedFrontmostApp.includes("Finder")) {
          selectedItems = await capturedFinderItemsPromise;
        }

        if (selectedItems.length > 0) {
          let content = "";
          for (const item of selectedItems) {
            content += `${FINDER_SELECTION_MARKER}{{file:${item.path}}}\n`;
          }
          fetchedSelectedText = content.trim();
          try {
            fetchedDiff = await getGitDiff(selectedItems[0].path);
          } catch {
            fetchedDiff = "";
          }
        } else {
          updateSelectedTextWhenReady();
        }
      } catch (error) {
        console.info("Failed to use captured selection:", error);
        fetchedSelectedText = "";
      }

      if (cancelled) return;
      setSelectionText(fetchedSelectedText);
      setDiff(fetchedDiff);
      startupLog("Initial context ready", {
        durationMs: startupElapsedMs(started),
        selectionMs: startupElapsedMs(selectionStarted),
        selectionLength: fetchedSelectedText.length,
        diffLength: fetchedDiff.length,
        source: "captured-selection",
      });
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [initialSelectionText, target]);

  return {
    selectionText,
    currentApp,
    allApp,
    browserContent,
    diff,
  };
}
