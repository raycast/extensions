import { Color, Icon, Image } from "@raycast/api";

export function healthIcon(status?: string): Image.ImageLike {
  switch (status) {
    case "Healthy":
      return { source: Icon.Heart, tintColor: Color.Green };
    case "Progressing":
      return { source: Icon.Heart, tintColor: Color.Blue };
    case "Degraded":
      return { source: Icon.Heart, tintColor: Color.Red };
    case "Suspended":
      return { source: Icon.Heart, tintColor: Color.Yellow };
    case "Missing":
      return { source: Icon.Heart, tintColor: Color.Orange };
    default:
      return { source: Icon.Heart, tintColor: Color.SecondaryText };
  }
}

export function syncIcon(status?: string): Image.ImageLike {
  switch (status) {
    case "Synced":
      return { source: Icon.ArrowClockwise, tintColor: Color.Green };
    case "OutOfSync":
      return { source: Icon.ArrowClockwise, tintColor: Color.Yellow };
    default:
      return { source: Icon.ArrowClockwise, tintColor: Color.SecondaryText };
  }
}
