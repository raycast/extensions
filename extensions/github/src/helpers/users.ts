import { Icon, Image } from "@raycast/api";

export function getGitHubUser(
  user?: {
    name?: string | null;
    login?: string | null;
    avatarUrl?: string | null;
  } | null,
) {
  if (!user) {
    return { icon: Icon.Person, text: "Unknown" };
  }

  return {
    icon: { source: user.avatarUrl ?? Icon.Person, mask: Image.Mask.Circle },
    text: (user.name ? user.name : user.login) ?? "-",
  };
}
