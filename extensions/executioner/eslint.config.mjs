import raycastConfig from "@raycast/eslint-config";

const configs = Array.isArray(raycastConfig) ? raycastConfig.flat(Infinity) : [raycastConfig];
export default configs;
