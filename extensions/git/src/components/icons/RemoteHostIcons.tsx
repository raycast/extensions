import { Color, Icon, Image } from "@raycast/api";
import { Remote, RemoteProvider } from "../../types/git-types";

export function RemoteHostIcon(remoteHost: Remote): Image.ImageLike {
  if (remoteHost.avatarUrl) {
    return {
      source: remoteHost.avatarUrl,
      mask: Image.Mask.RoundedRectangle,
      fallback: Icon.Globe,
    };
  }

  return RemoteHostProviderIcon(remoteHost.provider);
}

export function RemoteHostProviderIcon(provider: RemoteProvider): Image.ImageLike {
  switch (provider) {
    case "GitHub":
      return { source: "github.svg", tintColor: Color.PrimaryText };
    case "GitLab":
      return { source: "gitlab.svg", tintColor: Color.Red };
    case "Bitbucket":
      return { source: "bitbucket.svg", tintColor: Color.Blue };
    case "Azure DevOps":
      return { source: "azure-devops.svg", tintColor: Color.Blue };
    case "Gitea":
      return { source: "gitea.svg", tintColor: Color.Green };
    default:
      return { source: Icon.Globe, tintColor: Color.SecondaryText };
  }
}
