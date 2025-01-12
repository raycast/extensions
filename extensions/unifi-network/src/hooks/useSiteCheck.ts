import { useEffect } from "react";
import { showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import type { UnifiClient } from "../lib/unifi/unifi";
import type { Site } from "../lib/unifi/types/site";

interface SiteCheckProps {
  unifi: UnifiClient | undefined;
  site: Site | undefined;
  siteIsLoading: boolean;
  onRevalidate: () => void;
}

export function useSiteCheck({ unifi, site, siteIsLoading, onRevalidate }: SiteCheckProps) {
  useEffect(() => {
    if (siteIsLoading) {
      console.log("Site is loading");
      return;
    }

    if (!unifi) {
      console.log("No unifi");
      return;
    }

    if (!site) {
      console.log("No site");
      showToast({
        style: Toast.Style.Failure,
        title: "Select a site",
        message: "You must select a site before you can view devices and clients",
      });

      launchCommand({ name: "select-site", type: LaunchType.UserInitiated });
      return;
    }

    onRevalidate();
  }, [unifi, site, siteIsLoading, onRevalidate]);
}
