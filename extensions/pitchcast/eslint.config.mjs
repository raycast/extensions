import raycastConfig from "@raycast/eslint-config";

// Flatten the config array to handle any nested arrays (ESLint 9 flat config requires a flat array)
export default raycastConfig.flat();

