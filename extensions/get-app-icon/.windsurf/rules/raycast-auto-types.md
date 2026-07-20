---
trigger: always_on
---
In Raycast extensions, do not manually define a `Preferences` or `Arguments` interface/type for use with `getPreferenceValues<T>()` or command `Arguments`. Raycast auto-generates these types from the `package.json` manifest. Use the generated `ExtensionPreferences` and command-specific `Arguments` types from `raycast-env.d.ts` instead, or call `getPreferenceValues()` without a type parameter to get the inferred types.
