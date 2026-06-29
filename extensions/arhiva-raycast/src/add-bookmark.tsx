import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";

import { AuthGate } from "./components/auth-gate";
import { BookmarkForm } from "./components/bookmark-form";
import { getCurrentBrowserTabIfAvailable, type CurrentTab } from "./lib/browser-tab";

type PrefillState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready"; currentTab: CurrentTab | null }>;

function AddBookmarkForm() {
  const [state, setState] = useState<PrefillState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;
    void getCurrentBrowserTabIfAvailable()
      .then((currentTab) => {
        if (isMounted) {
          setState({ status: "ready", currentTab });
        }
      })
      .catch(() => {
        if (isMounted) {
          setState({ status: "ready", currentTab: null });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return <Detail isLoading markdown="" />;
  }

  return <BookmarkForm defaultUrl={state.currentTab?.url} defaultTitle={state.currentTab?.title} />;
}

export default function Command() {
  return (
    <AuthGate>
      <AddBookmarkForm />
    </AuthGate>
  );
}
