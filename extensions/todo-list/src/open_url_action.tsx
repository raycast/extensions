import { Action, Keyboard } from "@raycast/api";
import { URL } from "url";

const OpenUrlAction = ({ url, shortcut, title }: { url: string; shortcut?: Keyboard.Shortcut; title?: string }) => {
  const resolvedURL = url.includes(":") ? url : `http://${url}`;
  const hostname = new URL(resolvedURL).hostname;
  const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
  return (
    <>
      <Action.OpenInBrowser
        icon={{ source: faviconUrl }}
        shortcut={shortcut}
        title={title ?? resolvedURL}
        url={resolvedURL}
      />
    </>
  );
};

export default OpenUrlAction;
