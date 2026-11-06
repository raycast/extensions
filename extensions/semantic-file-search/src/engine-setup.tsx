import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, environment, Icon } from "@raycast/api";
import { distribution, Distribution } from "./runtime";

/** Explicit companion setup: a browser link, never a background binary download. */
export function EngineSetup(props: {
  message: string;
  failed: boolean;
  retry: () => void;
}) {
  const [policy, setPolicy] = useState<Distribution>();
  useEffect(() => {
    void distribution(environment.assetsPath)
      .then(setPolicy)
      .catch(() => setPolicy(undefined));
  }, []);
  const companion = policy?.mode === "companion";
  const instructions = companion
    ? `**Requires Apple silicon and macOS 26+.**

**1. Install the engine from GitHub**

Choose **Download Search Engine** for the ZIP from **nikusti/semantic-search on GitHub**. It includes Python and the required libraries, not model weights. Extract the ZIP, open **Semantic Search Engine Installer**, click **Install**, then return and choose **Check Installation**.

**2. Download a model from Hugging Face**

After the check succeeds, open **Manage Library** in Actions. Choose a model, add folders and select **Download & Apply**. Model weights download separately from Hugging Face. Reuse an installed model when available.

The installer is **unsigned and not notarized**; macOS may require approval to open it. Allow **2.5 GB** for the engine plus model and index space. Existing models and indexes are preserved.`
    : policy?.mode === "bundled"
      ? "The bundled engine installs offline. Your models and indexes stay in shared storage."
      : "Check the local engine installation and try again.";
  const markdown = [
    "# Set Up Local Search",
    props.message.replace(/[[\]`*_<>]/g, ""),
    instructions,
  ].join("\n\n");
  return (
    <Detail
      markdown={markdown}
      isLoading={!props.failed}
      actions={
        <ActionPanel>
          {companion && (
            <Action.OpenInBrowser
              title="Download Search Engine"
              icon={Icon.Download}
              url={policy.installer_url!}
            />
          )}
          <Action
            title={companion ? "Check Installation" : "Try Again"}
            icon={Icon.ArrowClockwise}
            onAction={props.retry}
          />
        </ActionPanel>
      }
    />
  );
}
