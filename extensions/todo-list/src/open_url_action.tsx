import { Action, Keyboard } from "@raycast/api";
import { URL } from "url";

const OpenUrlAction = ({ url, shortcut, title }: { url: string; shortcut?: Keyboard.Shortcut; title?: string }) => {
  const hostname = new URL(url).hostname;
  const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
  return (
    <>
      <Action.OpenInBrowser icon={{ source: faviconUrl }} shortcut={shortcut} title={title ?? url} url={url} />
    </>
  );
};

export default OpenUrlAction;
