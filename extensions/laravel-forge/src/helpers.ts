import { useEffect, useRef, useState } from "react";
import { API_RATE_LIMIT } from "./config";
import fetch from "node-fetch";
import { ISite } from "./Site";
import { Color, Icon } from "@raycast/api";

export const getProviderIcon = (provider: string): string => {
  switch (provider) {
    case "ocean2":
      return "https://forge.laravel.com/images/icons/digital-ocean.png";
    case "linode":
      return "https://forge.laravel.com/images/icons/linode.png";
    case "vultr":
      return "https://forge.laravel.com/images/icons/vultr.png";
    case "aws":
      return "https://forge.laravel.com/images/icons/aws.png";
    case "hetzner":
      return "https://forge.laravel.com/images/icons/hetzner.png";
    case "custom":
      return "https://forge.laravel.com/images/icons/custom.png";
  }
  return "";
};
export const useIsMounted = () => {
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  });
  return isMounted;
};

export const usePolling = (callback: () => Promise<void>) => {
  const [isPolling, setIsPolling] = useState(false);
  const isMounted = useIsMounted();
  const pollingId = useRef(0);
  const poll = () => {
    if (isPolling && isMounted.current) {
      return;
    }
    setIsPolling(true);
    callback().then(() => setIsPolling(false));
  };
  useEffect(() => {
    isPolling || callback();
    // Poll for the rate limit per minute plus 500ms leeway
    pollingId.current = window.setInterval(poll, 60000 / API_RATE_LIMIT + 500);
    return () => {
      window.clearInterval(pollingId.current);
    };
  }, []);
  return isPolling;
};

// TODO: I think this can be optimized
export const checkServerisOnline = async (urls: Array<string>): Promise<boolean> => {
  // If there are no URLs then we assume it's online - handles "Default" case
  urls = urls
    .map((url) => {
      try {
        return new URL("https://" + url).toString();
      } catch (error) {
        return "";
      }
    })
    .filter(Boolean);

  urls = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { method: "head" });
        return response.status === 200 ? url : "";
      } catch (error) {
        return "";
      }
    })
  );
  // If any of the urls are online we return true
  return urls.filter(Boolean).length > 0;
};

export const siteStatusState = (site: ISite) => {
  const details = {
    icon: { source: Icon.Circle, tintColor: Color.Green },
    text: "connected",
  };
  if (site.deploymentStatus === "failed") {
    details.icon.tintColor = Color.Red;
    details.text = "deployment failed";
  }
  if (!site.isOnline) {
    details.icon.tintColor = Color.Red;
    details.text = "offline";
  }
  if (site.deploymentStatus === "deploying") {
    details.icon.tintColor = Color.Purple;
    details.text = "deploying...";
  }

  return details;
};
