import { useEffect, useRef, useState } from "react";
import { API_RATE_LIMIT } from "./config";
import fetch from "node-fetch";
import { ISite } from "./Site";
import { Color, Icon } from "@raycast/api";

export const getServerColor = (provider: string): string => {
  // Colors pulled from their respective sites
  switch (provider) {
    case "ocean2":
      return "rgb(0, 105, 255)";
    case "linode":
      return "#02b159";
    case "vultr":
      return "#007bfc";
    case "aws":
      return "#ec7211";
    case "hetzner":
      return "#d50c2d";
    case "custom":
      return "rgb(24, 182, 155)"; // Forge color
  }
  return "rgb(24, 182, 155)";
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
    const id = setInterval(poll, 60000 / API_RATE_LIMIT + 500);
    return () => clearInterval(id);
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
