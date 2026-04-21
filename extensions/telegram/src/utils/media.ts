import { Icon, Image } from "@raycast/api";

export function getMediaTypeIcon(mediaType: string): Image.ImageLike {
  switch (mediaType) {
    case "photo":
    case "image":
      return Icon.Image;
    case "video":
    case "gif":
      return Icon.Video;
    case "audio":
    case "voice":
      return Icon.Music;
    case "file":
    case "document":
      return Icon.Document;
    case "link":
      return Icon.Link;
    case "location":
      return Icon.Pin;
    case "contact":
      return Icon.Person;
    case "poll":
      return Icon.BarChart;
    case "sticker":
      return Icon.Emoji;
    default:
      return Icon.Paperclip;
  }
}

export function getMediaDisplayTitle(mediaType: string): string {
  return mediaType.charAt(0).toUpperCase() + mediaType.slice(1);
}
