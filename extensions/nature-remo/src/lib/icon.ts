import { Color, Icon, Image } from "@raycast/api";

export function getIcon(icon: string): Image.ImageLike {
  switch (icon) {
    case "ico_on":
      return { source: Icon.ChevronUp };
    case "ico_off":
      return { source: Icon.ChevronDown };
    case "ico_color_red":
      return { source: Icon.Circle, tintColor: Color.Red };
    case "ico_color_yellow":
      return { source: Icon.Circle, tintColor: Color.Yellow };
    case "ico_color_blue":
      return { source: Icon.Circle, tintColor: Color.Blue };
    case "ico_mode_auto":
      return { source: Icon.ArrowClockwise };
    case "ico_io":
      return { source: Icon.MemoryChip };
    case "ico_tv":
      return { source: Icon.Desktop };
    case "ico_minus":
      return { source: Icon.SpeakerArrowDown };
    case "ico_plus":
      return { source: Icon.SpeakerArrowUp };
    case "ico_display":
      return { source: Icon.Binoculars };
    default:
      console.log("Unrecognized icon:", icon);

      return { source: Icon.Circle };
  }
}
