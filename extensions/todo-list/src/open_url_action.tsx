import { Action, Keyboard } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { URL } from "url";

const OpenUrlAction = ({ url, shortcut, title }: { url: string; shortcut?: Keyboard.Shortcut; title?: string }) => {
  let resolvedUrl = url;
  try {
    new URL(url);
  } catch (e) {
    try {
      resolvedUrl = `https://${url}`;
    } catch (e) {
      return null;
    }
  }

  return (
    <>
      <Action.OpenInBrowser icon={getFavicon(resolvedUrl)} shortcut={shortcut} title={title ?? url} url={resolvedUrl} />
    </>
  );
};

export default OpenUrlAction;
