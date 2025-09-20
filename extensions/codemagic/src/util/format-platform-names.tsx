export const formatPlatformName = (platform: string): string => {
  if (platform.toLowerCase() === "ios") {
    return "iOS";
  } else if (platform.toLowerCase() === "android") {
    return "Android";
  }
  return platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
};
