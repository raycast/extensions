# Migrating to v1.50.0

This version introduces an automated generation of typescript definitions for the preferences and arguments of your extension's commands.

After updating the API version, you will notice a new file at the root of the extension folder called `raycast-env.d.ts`.

- You shouldn't add this file to git so you have to update your `.gitignore` file:

  ```diff
  + raycast-env.d.ts
  ```

- You have to tell TypeScript to pick up this file to get access to its type definitions. To do so, update the `tsconfig.json` file:

  ```diff
  - "include": ["src/**/*"],
  + "include": ["src/**/*", "raycast-env.d.ts"],
  ```

- You can now update your code to leverage the automated types:

  ```diff
  ...
  - export default function Command(props: LaunchProps<{ arguments: { input: string } }>) {
  + export default function Command(props: LaunchProps<{ arguments: Arguments.CommandName }>) {
  ...

  ...
  - const prefs: { apiKey: string } = getPreferenceValues();
  + const prefs: Preferences.CommandName = getPreferenceValues();
  ...
  ```
