# Ghostty

Control Ghostty terminal with Raycast

## Launch Configurations

Launch configurations let you quickly open Ghostty windows, open tabs, navigate to folders and enter commands. They're inspired by [Warp's launch configurations](https://docs.warp.dev/features/sessions/launch-configurations). If you had already created a launch configuration in Warp, you can copy it into this extension.

### Creating a Launch Configuration

Create a YAML launch configuration and paste it into the `Open Ghostty Launch Configuration` command. See the simple example below.

### YAML Reference

- `name` required display name shown in Raycast
- `windows` required list of Ghostty windows; each additional item opens in a new Ghostty window
- `windows[].tabs` required list of tabs inside that window
- `windows[].tabs[].title` optional tab title; if omitted, the extension uses the tab directory name
- `windows[].tabs[].layout` required root pane for the tab
- `layout.cwd` optional working directory for that pane; supports `~`
- `layout.commands` optional list of commands to run in the pane, in order
- `layout.split_direction` optional split direction for child panes: `vertical` opens to the right, `horizontal` opens downward
- `layout.panes` optional child panes; the first child merges into the current pane, later children are added as splits

### How Panes Work

- Every tab starts from a single root `layout`
- `commands` on a pane are joined and executed in that pane
- `panes[0]` extends the current pane
- `panes[1]`, `panes[2]`, and so on create additional splits
- Nested `panes` let you build more complex layouts

### Simple Example

```yaml
name: Example Launch Configuration
windows:
  - tabs:
      - layout:
          cwd: ~/projects/my-repo
          commands:
            - exec: npm run dev
      - layout:
          cwd: ~/projects/other
          panes:
            - {}
            - split_direction: vertical
              commands:
                - exec: lazygit
```

### Example With Titles, Splits, and Multiple Windows

```yaml
name: App Fabricator
windows:
  - tabs:
      - title: app-fabricator
        layout:
          cwd: ~/Developer/slabware/app-fabricator
          panes:
            - commands:
                - exec: npm run dev
            - split_direction: vertical
              commands:
                - exec: lazygit
      - title: app-fabricator-api
        layout:
          cwd: ~/Developer/slabware/app-fabricator-api
          commands:
            - exec: npm run dev
  - tabs:
      - layout:
          cwd: ~/Developer/slabware/app-fabricator
          commands:
            - exec: npm test
```

### Notes and Behavior

- If a tab does not define `title`, the extension uses the last folder name from its effective directory. For example, `~/Developer/slabware/app-fabricator` becomes `app-fabricator`.
- If a window does not define its own title, the extension uses the root directory name of that launched window.
- `commands` are run by Ghostty as pasted input followed by Enter.
- A tab or pane can omit `commands` if you just want an interactive shell in that directory.

### Using Launch Configurations From Git Repos

The `Open Workspace from Git Repos` command can reuse your saved launch configurations for any repository it finds.

- When launched from the git repo list, the selected repository path overrides the configuration `cwd`
- Because of that override, only launch configurations with zero or one unique `cwd` are shown in the git repo list
- If a launch configuration contains two or more different `cwd` values anywhere in its tabs or nested panes, it is hidden from that command
- This keeps repo-based launching predictable, because the entire layout is remapped to the selected repository

Example of a config that will appear in the git repo list:

```yaml
name: Repo Dev
windows:
  - tabs:
      - layout:
          cwd: ~/some/default/repo
          panes:
            - commands:
                - exec: npm run dev
            - split_direction: vertical
              commands:
                - exec: lazygit
```

Example of a config that will not appear in the git repo list because it uses multiple different directories:

```yaml
name: Multi Repo Setup
windows:
  - tabs:
      - layout:
          cwd: ~/repo-a
      - layout:
          cwd: ~/repo-b
```
