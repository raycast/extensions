# ESLint

Raycast makes it easy to lint your extensions using the CLI's lint command (`ray lint`).

Raycast provides by default an [opinionated ESLint configuration](https://github.com/raycast/eslint-config/blob/main/index.js) that includes everything you need to lint your Raycast extensions. The default configuration is as simple as this:

```js
import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([...raycastConfig]);
```

It abstracts away the different ESLint dependencies used for Raycast extensions and includes different rule-sets.

It also includes Raycast's own ESLint plugin rule-set that makes it easier for you to follow best practices when building extension. For example, there's a [rule](https://github.com/raycast/eslint-plugin/blob/main/docs/rules/prefer-title-case.md) helping you follow the Title Case convention for `Action` components.

You can check Raycast's ESLint plugin rules directly on the [repository documentation](https://github.com/raycast/eslint-plugin#rules).

## Customization

You're free to turn on/off rules or add new plugins as you see fit for your extensions. For example, you could add the rule [`@raycast/prefer-placeholders`](https://github.com/raycast/eslint-plugin/blob/main/docs/rules/prefer-placeholders.md) for your extension:

```js
import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    rules: {
      "@raycast/prefer-placeholders": "warn",
    },
  },
]);
```

To keep the consistency of development experiences across extensions, we don't encourage adding too many personal ESLint preferences to an extension.

## Migration

Starting with version 1.48.8, the ESLint configuration is included automatically when creating a new extension using the `Create Extension` command. If your extension was created before this version, you can migrate following the steps outlined on the [v1.48.8](https://developers.raycast.com/migration/v1.48.8) page.
