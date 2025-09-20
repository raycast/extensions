import { ActionPanel, Image, ImageMask, OpenInBrowserAction } from "@raycast/api";

import { Author } from "@models";

import { avatarURL, checkIsValidURL } from "@urls";

type Props = {
  author: Author;
};

export function AuthorActionItem({ author }: Props): JSX.Element {
  let name = author.name ?? "Raycast";
  let url = author.url;

  if (!url) {
    return <ActionPanel.Item title={name} icon={avatarImage()} />;
  }

  if (url && url.length > 0 && (!url.startsWith("http") || !url.startsWith("https"))) {
    // As every url gives support at least to http, we are prepending http:// to the url.
    // This is an arbitrary decision.
    url = `http://${url}`;
  }

  if (checkIsValidURL(url)) {
    const path = new URL(url);

    if (path.host === "twitter.com") {
      name = `${name} (Twitter)`;
    } else if (path.host === "github.com") {
      name = `${name} (GitHub)`;
    }

    return <OpenInBrowserAction title={name} icon={avatarImage(url)} url={url} />;
  } else {
    return <ActionPanel.Item title={name} icon={avatarImage()} />;
  }
}

const avatarImage = (url: string | null = null): Image => {
  return {
    source: avatarURL(url),
    mask: ImageMask.Circle,
  };
};
