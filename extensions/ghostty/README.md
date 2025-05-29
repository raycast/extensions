# Ghostty

Control Ghostty terminal with Raycast

## Launch Configurations

Launch configurations let you quickly open Ghostty windows, open tabs, navigate to folders and enter commands. They're inspired by [Warp's launch configurations](https://docs.warp.dev/features/sessions/launch-configurations). If you had already created a launch configuration in Warp, you can copy it into this extension.

### Creating a Launch Configuration

To create a launch configuration, you'll need to create a YAML file.

Here's an example of a launch configuration:

```yaml
name: Example Launch Configuration
windows:
  - tabs:
      - layout:
          cwd: /Users/username/Raycast/ghostty
          commands:
            - exec: npm run dev
      - layout:
          cwd: /Users/username/Downloads
```
