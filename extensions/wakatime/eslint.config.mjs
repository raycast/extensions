import tseslint from "typescript-eslint";
import raycastConfig from "@raycast/eslint-config";

export default tseslint.config([...raycastConfig, tseslint.configs.recommended]);
