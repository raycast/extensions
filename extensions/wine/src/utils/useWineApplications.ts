import { useState, useEffect } from "react";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { parseDesktopFileContent, resolveIconPath, fileExists } from "./desktop";
import { ApplicationItem, WinePreferences } from "../types";

// Caches to improve performance
const parseCache = new Map<string, ReturnType<typeof parseDesktopFileContent>>();
const iconCache = new Map<string | undefined, string | undefined>();

export function useWineApplications() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const preferences = getPreferenceValues<WinePreferences>();
  const wineProgramsPath = path.join(os.homedir(), ".local", "share", "applications", "wine", "Programs");
  const additionalDirs = (preferences.additionalDesktopDirs || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  const searchDirs = [wineProgramsPath, ...additionalDirs];

  useEffect(() => {
    async function fetchApplications() {
      setIsLoading(true);
      try {
        const allApps: ApplicationItem[] = [];
        for (const dir of searchDirs) {
          if (!(await fileExists(dir))) continue;
          const entries = await fs.promises.readdir(dir, { withFileTypes: true });
          const entryPromises = entries.map(async (entry) => {
            const localApps: ApplicationItem[] = [];
            const entryPath = path.join(dir, entry.name);
            const processDesktop = async (filePath: string) => {
              try {
                const content = await fs.promises.readFile(filePath, "utf-8");
                const parsed = parseCache.has(filePath)
                  ? parseCache.get(filePath)!
                  : parseCache.set(filePath, parseDesktopFileContent(content)).get(filePath)!;
                if (parsed.name && parsed.exec) {
                  const resolvedIconPath = iconCache.has(parsed.icon)
                    ? iconCache.get(parsed.icon)
                    : iconCache.set(parsed.icon, await resolveIconPath(parsed.icon)).get(parsed.icon);
                  localApps.push({
                    id: filePath,
                    name: parsed.name,
                    exec: parsed.exec,
                    iconValue: parsed.icon,
                    resolvedIconPath,
                    pathValue: parsed.path,
                    comment: parsed.comment,
                  });
                }
              } catch (e) {
                console.error(`Error parsing ${filePath}:`, e);
                await showToast({
                  style: Toast.Style.Failure,
                  title: `Error parsing ${filePath}`,
                  message: e instanceof Error ? e.message : String(e),
                });
              }
            };
            if (entry.isFile() && entry.name.endsWith(".desktop")) {
              await processDesktop(entryPath);
            } else if (entry.isDirectory()) {
              const subDirEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });
              await Promise.all(
                subDirEntries.map((subEntry) =>
                  subEntry.isFile() && subEntry.name.endsWith(".desktop")
                    ? processDesktop(path.join(entryPath, subEntry.name))
                    : Promise.resolve(),
                ),
              );
            }
            return localApps;
          });
          const apps = await Promise.all(entryPromises);
          allApps.push(...apps.flat());
        }
        setApplications(allApps);
      } catch (error) {
        console.error("Failed to load wine applications:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Applications",
          message: error instanceof Error ? error.message : String(error),
        });
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchApplications();
  }, []);

  return { applications, isLoading };
}
