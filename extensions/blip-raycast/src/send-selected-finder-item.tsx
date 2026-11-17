import { Detail, type LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { RecipientList } from "./components/RecipientList";
import type { SendContent } from "./lib/content";
import type { QuickSendSetupContext } from "./lib/quick-send";
import { fileManagerName, getSelectedPaths } from "./lib/selection";

export default function Command({ launchContext }: LaunchProps<{ launchContext?: QuickSendSetupContext }>) {
  // undefined = still reading, null = nothing selected.
  const [content, setContent] = useState<SendContent | null>();

  useEffect(() => {
    getSelectedPaths()
      .then((paths) =>
        setContent(paths.length ? { kind: "files", paths, source: `Selected in ${fileManagerName}` } : null),
      )
      .catch(() => setContent(null));
  }, []);

  if (content === null) {
    return (
      <Detail
        markdown={`# Nothing selected\n\nSelect one or more files or folders in ${fileManagerName}, then run this command again.`}
      />
    );
  }

  return <RecipientList content={content} rememberForQuickSend={launchContext?.setupQuickSend} />;
}
