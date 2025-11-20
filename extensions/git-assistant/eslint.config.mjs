import raycastConfig from "@raycast/eslint-config";

const flattenedConfig = raycastConfig.flatMap((entry) =>
    Array.isArray(entry) ? entry : [entry]
);

export default flattenedConfig;
