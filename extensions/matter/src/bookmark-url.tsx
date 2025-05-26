import { List, showToast, Toast } from "@raycast/api";
import { useClipboard } from "raycast-hooks";
import { useEffect, useState } from "react";
import { bookmarkUrl } from "./matterApi";
import { showFailureToast } from "@raycast/utils";

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

type BookmarkResponse = { id?: string; detail?: string; raw?: string; status?: number };

export default function BookmarkUrlCommand() {
  const { clipboard, ready } = useClipboard();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [hasTried, setHasTried] = useState<boolean>(false);

  useEffect(() => {
    if (!hasTried && ready && clipboard && isValidUrl(clipboard)) {
      setHasTried(true);
      (async () => {
        await showToast(Toast.Style.Animated, "Bookmarking URL...");
        try {
          const res: BookmarkResponse = await bookmarkUrl(clipboard);
          if (res.status && res.status >= 200 && res.status < 300) {
            setSuccess(true);
            await showToast(Toast.Style.Success, "Bookmarked!", clipboard);
          } else {
            const errorMsg = res.detail || res.raw || JSON.stringify(res);
            setError(errorMsg);
            await showToast(Toast.Style.Failure, "Error", errorMsg);
          }
        } catch (e) {
          setError("Unknown error");
          showFailureToast(e, { title: "Error" });
        }
      })();
    }
  }, [clipboard, ready, hasTried]);

  if (!clipboard || !isValidUrl(clipboard)) {
    return (
      <List isLoading={!ready} searchBarPlaceholder="Copy a URL to your clipboard">
        <List.EmptyView icon="logo.png" title="Copy a valid URL to your clipboard" />
      </List>
    );
  }

  if (success) {
    return (
      <List>
        <List.EmptyView icon="logo.png" title="Bookmarked!" description={clipboard} />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView icon="logo.png" title="Error" description={error} />
      </List>
    );
  }

  return (
    <List isLoading searchBarPlaceholder="Bookmarking URL...">
      <List.EmptyView icon="logo.png" title="Bookmarking URL..." description={clipboard} />
    </List>
  );
}
