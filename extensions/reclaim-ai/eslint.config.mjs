import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@raycast/utils",
              importNames: ["useFetch"],
              message: "Use useApi instead.",
            },
          ],
        },
      ],
    },
  },
]);
