# `createDeeplink`

Function that creates a deeplink for an extension or script command.

## Signature

There are three ways to use the function.

The first one is for creating a deeplink to a command inside the current extension:

```ts
function createDeeplink(options: {
  type?: DeeplinkType.Extension,
  command: string,
  launchType?: LaunchType,
  arguments?: LaunchProps["arguments"],
  fallbackText?: string,
}): string;
```

The second one is for creating a deeplink to an extension that is not the current extension:

```ts
function createDeeplink(options: {
  type?: DeeplinkType.Extension,
  ownerOrAuthorName: string,
  extensionName: string,
  command: string,
  launchType?: LaunchType,
  arguments?: LaunchProps["arguments"],
  fallbackText?: string,
}): string;
```

The third one is for creating a deeplink to a script command:

```ts
function createDeeplink(options: {
  type: DeeplinkType.ScriptCommand,
  command: string,
  arguments?: string[],
}): string;
```

### Arguments

#### Extension

- `type` is the type of the deeplink. It must be `DeeplinkType.Extension`.
- `command` is the name of the command to deeplink to.
- `launchType` is the type of the launch.
- `arguments` is an object that contains the arguments to pass to the command.
- `fallbackText` is the text to show if the command is not available.
- For intra-extension deeplinks:
  - `ownerOrAuthorName` is the name of the owner or author of the extension.
  - `extensionName` is the name of the extension.

#### Script command

- `type` is the type of the deeplink. It must be `DeeplinkType.ScriptCommand`.
- `command` is the name of the script command to deeplink to.
- `arguments` is an array of strings to be passed as arguments to the script command.

### Return

Returns a string.

## Example

```tsx
import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import { createDeeplink, DeeplinkType } from "@raycast/utils";

export default function Command(props: LaunchProps<{ launchContext: { message: string } }>) {
  console.log(props.launchContext?.message);

  return (
    <List>
      <List.Item
        title="Extension Deeplink"
        actions={
          <ActionPanel>
            <Action.CreateQuicklink
              title="Create Deeplink"
              quicklink={{
                name: "Extension Deeplink",
                link: createDeeplink({
                  command: "create-deeplink",
                  context: {
                    message: "Hello, world!",
                  },
                }),
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="External Extension Deeplink"
        actions={
          <ActionPanel>
            <Action.CreateQuicklink
              title="Create Deeplink"
              quicklink={{
                name: "Create Triage Issue for Myself",
                link: createDeeplink({
                  ownerOrAuthorName: "linear",
                  extensionName: "linear",
                  command: "create-issue-for-myself",
                  arguments: {
                    title: "Triage new issues",
                  },
                }),
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Script Command Deeplink"
        actions={
          <ActionPanel>
            <Action.CreateQuicklink
              title="Create Deeplink"
              quicklink={{
                name: "Deeplink with Arguments",
                link: createDeeplink({
                  type: DeeplinkType.ScriptCommand,
                  command: "count-chars",
                  arguments: ["a b+c%20d"],
                }),
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

## Types

### DeeplinkType

A type to denote whether the deeplink is for a script command or an extension.

```ts
export enum DeeplinkType {
  /** A script command */
  ScriptCommand = "script-command",
  /** An extension command */
  Extension = "extension",
}
```
