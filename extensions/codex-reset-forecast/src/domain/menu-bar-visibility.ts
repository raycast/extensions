export function shouldShowMenuBar(storedVisibility: string | undefined): boolean {
  return storedVisibility !== "false";
}

export function visibilityForLaunch(
  storedVisibility: string | undefined,
  launchType: "userInitiated" | "background",
): boolean {
  // Both root search and opening the menu use userInitiated. Neither may hide an open menu.
  return launchType === "userInitiated" || shouldShowMenuBar(storedVisibility);
}
