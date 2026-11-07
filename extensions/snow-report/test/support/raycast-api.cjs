// Stand-in for @raycast/api, which only loads inside Raycast. Tests set preferences on globalThis.
module.exports = {
  getPreferenceValues: () => globalThis.raycastPreferences ?? { units: "metric" },
  environment: { appearance: "light", assetsPath: "" },
};
