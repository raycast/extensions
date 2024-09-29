import { Image, Icon, Color } from "@raycast/api";

export function createIcon(status: string): Image.ImageLike {
  switch (status) {
    case "started":
      return { source: Icon.Play, tintColor: Color.Green };
    case "running":
      return { source: Icon.PlayFilled, tintColor: Color.Green };
    case "error":
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    case "none":
      return { source: Icon.Stop, tintColor: Color.PrimaryText };
    default:
      return { source: Icon.QuestionMark, tintColor: Color.Red };
  }
}
