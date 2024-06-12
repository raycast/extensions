import { Action, Icon, open } from "@raycast/api";
import { SearchResult } from "../useSearch";
import { useCallback } from "react";
import { messaging } from "../messaging";

interface OpenInBrowserProps {
  imageUrl: SearchResult["image_url"];
}

const OpenInBrowser = ({ imageUrl }: OpenInBrowserProps) => {
  const handleAction = useCallback(() => {
    open(imageUrl);
  }, [imageUrl]);

  return <Action title={messaging.ACTION_OPEN_IN_BROWSER} onAction={handleAction} icon={Icon.Window} />;
};

export { OpenInBrowser, type OpenInBrowserProps };
