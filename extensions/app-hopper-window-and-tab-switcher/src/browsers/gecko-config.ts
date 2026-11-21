export type GeckoBrowserId = "firefox" | "zen";

export function geckoConfig(id: GeckoBrowserId = "firefox") {
  const appName = id === "zen" ? "Zen" : "Firefox";
  return {
    id,
    appName,
    bundleId: id === "zen" ? "app.zen-browser.zen" : "org.mozilla.firefox",
    hostName: `app_hopper.${id}`,
    addonId: "app-hopper-firefox@chenghsj",
    binaryPrefix: id === "zen" ? "zen-bridge" : "firefox-bridge",
  };
}
