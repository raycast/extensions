import { Action, Keyboard } from "@raycast/api";
import type { FontInfo } from "../types";
import { getFontSearchLinks } from "../utils/fontActions";
import { isValidUrl } from "../utils/urlHelpers";

export function FontActions({
  font,
  family = font.family,
}: {
  font: FontInfo;
  family?: string;
}) {
  const links = getFontSearchLinks(family);
  return (
    <>
      <Action.CopyToClipboard
        title="Copy Font Name"
        content={family}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      {family !== font.family && (
        <Action.CopyToClipboard
          title="Copy CSS Family Name"
          content={font.family}
        />
      )}
      {!font.isDataUri && isValidUrl(font.url) && (
        <Action.CopyToClipboard title="Copy Font URL" content={font.url} />
      )}
      <Action.OpenInBrowser
        title="Search Google Fonts"
        url={links.googleFonts}
      />
      <Action.OpenInBrowser title="Search Web for Font" url={links.web} />
    </>
  );
}
