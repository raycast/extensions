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
  const markdown = companion
    ? `# Local Search Engine\n\nSemantic Search runs EmbeddingGemma 2 and searches your files locally.\n\n**Requires Apple silicon and macOS 26+.**\n\n1. Download the **Search Engine installer** from the release page.\n2. Open it and click **Install**. Python and the required libraries are included; no terminal setup is needed.\n3. Return here and choose **Check Installation**, then download a model and select your folders.\n\nAllow approximately **2.5 GB** of free space for engine installation, plus model weights and your index. Existing models and indexes are preserved.\n\n${props.message.replace(/[[\]`*_<>]/g, "")}`
    : `# Semantic Search\n\n${props.message.replace(/[[\]`*_<>]/g, "")}\n\nThe bundled engine installs offline. Your models and indexes stay in shared storage.`;
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
