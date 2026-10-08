import { Color, Icon } from "@raycast/api";

export function getIcon(contentType?: string) {
  const contentGroup = contentType?.split("/")[0];
  let icon: Icon = Icon.Circle;
  switch (contentGroup) {
    case "":
      icon = Icon.ArrowRight;
      break;
    case "image":
      icon = Icon.Eye;
      break;
    case "audio":
      icon = Icon.Phone;
      break;
    case "video":
      icon = Icon.Video;
      break;
    case "text":
      icon = Icon.BlankDocument;
      break;
    case "application":
      icon = Icon.Document;
      break;
  }
  return { source: icon, tintColor: Color.Blue };
}
