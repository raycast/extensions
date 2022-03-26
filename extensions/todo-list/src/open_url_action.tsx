import { Action, Keyboard } from "@raycast/api";
import { URL } from "url";

const OpenUrlAction = ({ url, shortcut, title }: { url: string; shortcut?: Keyboard.Shortcut; title?: string }) => {
  let hostname;
  let resolvedUrl = url;
  try {
    hostname = new URL(url).hostname;
  } catch (e) {
    try {
      resolvedUrl = `https://${url}`;
      hostname = new URL(resolvedUrl).hostname;
    } catch (e) {
      return null;
    }
  }
  const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
  return (
    <>
      <Action.OpenInBrowser icon={{ source: faviconUrl }} shortcut={shortcut} title={title ?? url} url={resolvedUrl} />
    </>
  );
};

export default OpenUrlAction;
