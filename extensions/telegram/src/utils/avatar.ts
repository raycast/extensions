import { Icon, Image, Color } from "@raycast/api";

export interface AvatarOptions {
  photo?: string;
  name: string;
  type?: "private" | "group" | "supergroup" | "channel";
}

export function getAvatarIcon(options: AvatarOptions): Image.ImageLike {
  if (options.photo) {
    return { source: options.photo, mask: Image.Mask.Circle };
  }

  // Generate a consistent color based on name
  const colors = [Color.Blue, Color.Green, Color.Orange, Color.Purple, Color.Red, Color.Magenta, Color.Yellow];

  // Simple hash function for the name
  let hash = 0;
  for (let i = 0; i < options.name.length; i++) {
    hash = options.name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;

  // Use different icons based on type
  let iconSource: Icon;
  switch (options.type) {
    case "private":
      iconSource = Icon.PersonCircle;
      break;
    case "group":
      iconSource = Icon.Message;
      break;
    default:
      iconSource = Icon.Message;
  }

  return {
    source: iconSource,
    tintColor: colors[colorIndex],
  };
}
