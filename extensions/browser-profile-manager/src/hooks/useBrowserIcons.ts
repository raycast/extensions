import { getApplications, Icon, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { BrowserType } from "../types";

const FALLBACK_ICONS: Record<BrowserType, Image.ImageLike> = {
  Chrome: Icon.Globe,
  Edge: Icon.Globe,
  Firefox: Icon.Globe,
  Comet: Icon.Globe,
};

const BROWSER_APP_NAMES: Record<BrowserType, string[]> = {
  Chrome: ["Google Chrome", "Chrome"],
  Edge: ["Microsoft Edge", "Edge"],
  Firefox: ["Firefox", "Mozilla Firefox"],
  Comet: ["Comet"],
};

interface UseBrowserIconsResult {
  browserIcons: Record<BrowserType, Image.ImageLike>;
}

export function useBrowserIcons(): UseBrowserIconsResult {
  const [browserIcons, setBrowserIcons] =
    useState<Record<BrowserType, Image.ImageLike>>(FALLBACK_ICONS);

  useEffect(() => {
    let cancelled = false;

    async function loadIcons() {
      try {
        const applications = await getApplications();
        const nextIcons: Record<BrowserType, Image.ImageLike> = {
          ...FALLBACK_ICONS,
        };

        for (const [browser, names] of Object.entries(
          BROWSER_APP_NAMES,
        ) as Array<[BrowserType, string[]]>) {
          const match = applications.find((application) =>
            names.some((name) =>
              application.name
                .toLocaleLowerCase()
                .includes(name.toLocaleLowerCase()),
            ),
          );

          if (match) {
            nextIcons[browser] = { fileIcon: match.path };
          }
        }

        if (!cancelled) {
          setBrowserIcons(nextIcons);
        }
      } catch {
        if (!cancelled) {
          setBrowserIcons(FALLBACK_ICONS);
        }
      }
    }

    void loadIcons();

    return () => {
      cancelled = true;
    };
  }, []);

  return { browserIcons };
}
