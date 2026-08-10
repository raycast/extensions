import { Color, Icon, Image } from "@raycast/api";
import { ISite } from "../types";

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

export const getDeplymentStateIcon = (status: string): { text: string; icon: Image.ImageLike } => {
  if (status === "failed") {
    return {
      icon: { source: Icon.MinusCircleFilled, tintColor: Color.Red },
      text: "deployment failed",
    };
  }
  if (status === "deploying") {
    const progressIcons = [
      Icon.Circle,
      Icon.CircleProgress25,
      Icon.CircleProgress50,
      Icon.CircleProgress75,
      Icon.CircleProgress100,
    ];
    // based on the time we can return a progress icon
    const timeNow = new Date().getTime();
    const source = progressIcons[Math.floor((timeNow / 1000) % 5)];
    return {
      icon: { source, tintColor: Color.Purple },
      text: "deploying...",
    };
  }
  return {
    icon: { source: Icon.CheckCircle, tintColor: Color.Green },
    text: status,
  };
};

export const siteStatusState = (site: ISite, online: boolean) => {
  if (site.deployment_status === "failed") return getDeplymentStateIcon(site.deployment_status);
  if (!online) {
    return {
      icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
      text: "offline",
    };
  }
  const status = getDeplymentStateIcon(site.deployment_status || "connected");
  if (status.text === "finished") {
    return { ...status, text: "connected" };
  }
  return status;
};
