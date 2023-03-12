# ESLint

Raycast makes it easy to lint your extensions using the CLI's lint command (`ray lint`).

Raycast provides by default an [opinionated ESLint configuration](https://github.com/raycast/eslint-config/blob/main/index.js) that includes everything you need to lint your Raycast extensions. The default configuration is as simple as this:

```json
{ 
  "root": true,
  "extends": [
    "@raycast"
  ]
}
```

It abstracts away the different ESLint dependencies used for Raycast extensions and includes different rule-sets.

It also includes Raycast's own ESLint plugin rule-set that makes it easier for you to follow best practices when building extension. For example, there's a [rule](https://github.com/raycast/eslint-plugin/blob/main/docs/rules/prefer-title-case.md) helping you follow the Title Case convention for `Action` components.

You can check Raycast's ESLint plugin rules directly on the [repository documentation](https://github.com/raycast/eslint-plugin#rules).

## Customization

You're free to turn on/off rules or add new plugins as you see fit for your extensions. For example, you could add the rule [`@raycast/prefer-placeholders`](https://github.com/raycast/eslint-plugin/blob/main/docs/rules/prefer-placeholders.md) for your extension:


```json
{
  "root": true,
  "extends": [
    "@raycast"
  ],
  "rules": {
    "@raycast/prefer-placeholders": "warn"
  }
}
```