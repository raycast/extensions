import { getFrontmostApplication } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Application } from "./model/internal/internal-models";
import useAllShortcuts from "./load/shortcuts-provider";
import { ShortcutsList } from "./view/shortcuts-list";
import { exitWithMessage } from "./view/exit-action";

export default function AppShortcuts(props?: { app: Application }) {
  const [application, setApplication] = useState<Application | undefined>(props?.app);
  const [bundleId, setBundleId] = useState(props?.app?.bundleId);
  const shortcutsProviderResponse = useAllShortcuts({ execute: !props?.app });

  useEffect(() => {
    if (application || shortcutsProviderResponse.isLoading || !bundleId) {
      return;
    }
    const foundApp = shortcutsProviderResponse.data.applications.find((app) => app.bundleId === bundleId);
    if (!foundApp) {
      exitWithMessage(`Shortcuts not available for application ${bundleId}`);
      return;
    }
    setApplication(foundApp);
  }, [shortcutsProviderResponse.isLoading, bundleId, application]);

  usePromise(async () => application?.bundleId ?? (await getFrontmostApplication()).bundleId, [], {
    onData: (bundleId) => {
      if (!bundleId) return;
      setBundleId(bundleId);
    },
    execute: !props?.app,
  });

  return <ShortcutsList application={application} />;
}
