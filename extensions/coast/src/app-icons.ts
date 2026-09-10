import { getApplications, Icon, type Image } from "@raycast/api";
import { useEffect, useState } from "react";

export function useAppIcons() {
  const [paths, setPaths] = useState<Record<string, string>>({});
  useEffect(() => {
    getApplications()
      .then((applications) => {
        const next: Record<string, string> = {};
        for (const app of applications) {
          next[app.name] = app.path;
          if (app.bundleId) next[app.bundleId] = app.path;
        }
        setPaths(next);
      })
      .catch(() => {});
  }, []);
  return (name: string): Image.ImageLike =>
    paths[name] ? { fileIcon: paths[name] } : Icon.Window;
}
