export const formatPlatformName = (platform: string): string => {
  if (platform.toLowerCase() === "ios") {
    return "iOS";
  } else if (platform.toLowerCase() === "android") {
    return "Android";
  }
  // For any other platforms, return them capitalized
  return platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
};
