import { List, Icon, showToast, Toast, getPreferenceValues, LocalStorage } from "@raycast/api";
import React from "react";
import { listCatalog } from "./lib/github/api";
import { Preferences } from "./lib/types";

export default function Command(): JSX.Element {
  const [state, setState] = React.useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    (async () => {
      try {
        const prefs = getPreferenceValues<Preferences>();
        const token = prefs.githubToken || "";
        const catalog = await listCatalog(token);
        await LocalStorage.setItem("github_models_catalog", JSON.stringify(catalog));
        await showToast({ style: Toast.Style.Success, title: "GitHub Models synced" });
        setState("done");
      } catch (e: any) {
        const msg = String(e?.message || e);
        await showToast({ style: Toast.Style.Failure, title: "Sync failed", message: msg });
        setMessage(msg);
        setState("error");
      }
    })();
  }, []);

  const title = state === "done" ? "Synced GitHub Models" : state === "error" ? "Sync Failed" : "Syncing...";
  const description = state === "done" ? "Catalog cached locally" : message;
  const icon = state === "done" ? Icon.CheckCircle : state === "error" ? Icon.XmarkCircle : Icon.ArrowDownCircle;

  return (
    <List isLoading={state === "loading"} searchBarPlaceholder="Sync GitHub Models">
      <List.EmptyView icon={icon} title={title} description={description} />
    </List>
  );
}
