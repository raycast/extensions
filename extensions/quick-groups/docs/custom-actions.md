# Standard actions and extension points

Quick Groups starts with a thing and presents the actions associated with it. Standard actions work directly from YAML: `open`, `ssh`, `obsidian`, `pwd`, `application/<name>`, and `raycast/script/<command>`. This makes it possible to build a useful ecosystem around each project, machine, document, or other concept without changing the extension.

The compile-time registry is an advanced extension point for behavior that genuinely requires code. YAML files select actions and provide data, but never contain executable code.

## Standard actions

## Open with an application

No registration is required to pass a value to a named macOS application:

```yaml
projects:
  home:
    location:
      value: ~
      open: ${value}
      application/Terminal: ${value}
      application/Finder: ${value}
writing:
  play:
    manuscript:
      value: ~/Writing/My Play.scriv
      application/Scrivener: ${value}
```

Use the application's displayed macOS name after `application/`. Quick Groups resolves the value and asks macOS to open it with that application. A leading `~` is expanded to the current user's home directory when `open` or `application/<name>` runs, while the YAML value remains portable.

Collections do not have to remain as broad as `projects`; related records can move into tighter groups such as `writing`. Application targets may be application-specific project bundles, as shown by the Scrivener play, as well as ordinary directories and files.

## Launch a Raycast Script Command

No registration is required for the common one-argument case:

```yaml
projects:
  reference:
    directory:
      value: /Users/me/Projects/reference
      raycast/script/open-project: ${value}
```

Quick Groups launches the installed `open-project` Script Command and passes the resolved value as argument 1. It generates Raycast's supported deeplink and lets Raycast perform the launch; Quick Groups does not locate, read, or execute the script itself.

The corresponding Script Command declares and consumes that argument normally:

```bash
#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Open Project
# @raycast.mode silent
# @raycast.argument1 { "type": "text", "placeholder": "Project path" }

project_path="$1"
# Your personal automation goes here.
```

The Script Command must already be installed and enabled in Raycast.

## Custom code extensions

Use the compile-time registry only when the standard actions cannot express the behavior. For example, this custom action transforms a URL before copying it:

```tsx
import { Action, Icon } from "@raycast/api";
import { registerAction } from "./registry";

registerAction({
  name: "copy-markdown-link",
  title: "Copy Markdown Link",
  icon: Icon.Link,
  render: (target) => (
    <Action.CopyToClipboard
      title="Copy Markdown Link"
      content={`[Open project](${target})`}
      icon={Icon.Link}
    />
  ),
});
```

Add the registration to `src/actions/custom.tsx`, then use it in YAML:

```yaml
projects:
  reference:
    repository:
      value: https://github.com/example/reference
      copy-markdown-link: ${value}
```

Run `npm test && npm run dev` after changing the source. References such as `${value}` are resolved before the target reaches the action.

## Custom-action registration contract

`registerAction` accepts:

- `name`: the stable YAML annotation. Use lowercase letters, numbers, underscores, or hyphens, beginning with a letter.
- `title`: the human-readable action title.
- `icon`: a Raycast icon or other `Image.ImageLike`.
- `sensitive`: optional. When true, the target and values derived from it are excluded from display and search.
- `render(target)`: returns one Raycast `Action` component. `target` is the resolved annotation value.

Duplicate and invalid action names fail during development rather than silently replacing an action.

## Contribute a standard action

An action that is portable and broadly useful can be proposed as a standard action. Add it to `src/actions/built-ins.tsx` or an appropriate standard action family, include focused tests, document its YAML form, and open a pull request.

Do not implement an action by evaluating JavaScript or interpolating its target into a shell command. Use Raycast actions and APIs directly, validate targets where appropriate, and keep secrets out of titles, logs, and error messages.

### Advanced Script Command registration

Use `registerScriptCommandAction` only when a Script Command needs a custom title, icon, sensitivity setting, or argument mapping:

```tsx
import { Icon } from "@raycast/api";
import { registerScriptCommandAction } from "./script-command";

registerScriptCommandAction({
  name: "herdr",
  title: "Open with herdr",
  command: "open-project",
  icon: Icon.Terminal,
});
```

The resolved annotation target is passed as argument 1 by default:

```yaml
projects:
  reference:
    directory:
      value: /Users/me/Projects/reference
      herdr: ${value}
```

Custom argument mapping supports up to Raycast's three Script Command arguments:

```tsx
registerScriptCommandAction({
  name: "open-dev-project",
  title: "Open Development Project",
  command: "open-project",
  arguments: (target) => [target, "development"],
});
```

This advanced registration is not needed for `raycast/script/<command>`.
