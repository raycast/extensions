import { useEffect, useRef, useState } from "react";
import { API_RATE_LIMIT } from "./config";
import { ISite } from "./Site";
import { Icon } from "@raycast/api";

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

export const capitalizeFirstLetter = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
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

    const id = setInterval(poll, 60000 / API_RATE_LIMIT + 500);
    return () => clearInterval(id);
  }, []);
  return isPolling;
};

export const siteStatusState = (site: ISite) => {
  const details = {
    icon: { source: Icon.Dot, tintColor: "#31c48d" },
    text: "Active",
  };

  if (site.status === "deploying") {
    details.icon.tintColor = "#1853db";
    details.text = "Deploying...";
  }

  if (site.status === "deploy-failed") {
    details.icon.tintColor = "#e3a008";
    details.text = "Deployment failed";
  }

  if (
    site.status === "suspended" ||
    site.status === "repository-installing" ||
    site.status === "building" ||
    site.status === "staging-production-syncing" ||
    site.status === "deleting"
  ) {
    details.icon.tintColor = "#9CA3AF";
    details.text = capitalizeFirstLetter(`${site.status}`).split("-").join(" ");
  }

  return details;
};

export const getHeaders = (token: string) => {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Custom-Ploi-Agent": "Raycast",
  };
};
