import { AppIcons, SupportedApps } from "../types";

export const isValidUrl = (urlString: string) => {
  const urlPattern = new RegExp(/^(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-?=%.]+$/g);
  return !!urlPattern.test(urlString);
};

export const isZoomLink = (urlString: string) => {
  const zoomPattern = new RegExp(/https:\/\/[\w-]*\.?zoom.us\/(j|my)\/[\d\w?=-]+/g);
  return !!zoomPattern.test(urlString);
};

export const isTeamsLink = (urlString: string) => {
  const teamsPattern = new RegExp(/https:\/\/teams.microsoft.com\/l\/meetup-join\/[\d\w?=-]+/g);
  return !!teamsPattern.test(urlString);
};

export const isMeetLink = (urlString: string) => {
  const meetPattern = new RegExp(/https:\/\/meet.google.com\/[\d\w?=-]+/g);
  return !!meetPattern.test(urlString);
};

export const isMeetingLink = (urlString: string) => {
  return isZoomLink(urlString) || isTeamsLink(urlString) || isMeetLink(urlString);
};

export const detectMeetingApp = (
  urlString: string
): {
  app: SupportedApps;
  icon: AppIcons;
} => {
  if (isZoomLink(urlString)) {
    return {
      app: SupportedApps.Zoom,
      icon: AppIcons.Zoom,
    };
  }

  if (isTeamsLink(urlString)) {
    return {
      app: SupportedApps.Teams,
      icon: AppIcons.Teams,
    };
  }

  if (isMeetLink(urlString)) {
    return {
      app: SupportedApps.Meet,
      icon: AppIcons.Meet,
    };
  }

  return {
    app: SupportedApps.Generic,
    icon: AppIcons.Generic,
  };
};
