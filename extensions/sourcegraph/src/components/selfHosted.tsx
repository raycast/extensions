import { Detail } from "@raycast/api";
import { ReactElement } from "react";
import { sourcegraphSelfHosted, Sourcegraph, isCloud } from "../sourcegraph";

export default function SelfHostedCommand({ command }: { command: (src: Sourcegraph) => ReactElement }) {
  const tryCloudMessage = "Alternatively, you can try the Sourcegraph Cloud version of this command first.";

  const src = sourcegraphSelfHosted();
  if (!src) {
    return (
      <Detail
        navigationTitle="Invalid self-hosted Sourcegraph URL"
        markdown={`**⚠️ No Sourcegraph Sourcegraph Self-Hosted instance configured** - set one up in the extension preferences!\n\n${tryCloudMessage}`}
      />
    );
  }
  try {
    new URL(src.instance);
  } catch (e) {
    return (
      <Detail
        navigationTitle="Invalid Sourcegraph Self-Hosted URL"
        markdown={`**⚠️ Sourcegraph Self-Hosted URL '${src.instance}' is invalid:** ${e}\n\nUpdate it in the extension preferences!\n\n${tryCloudMessage}`}
      />
    );
  }
  if (!isCloud(src.instance) && !src.token) {
    return (
      <Detail
        navigationTitle="Invalid Sourcegraph Self-Hosted access token"
        markdown={`**⚠️ A token is required for Sourcegraph Self-Hosted instance '${src.instance}'** - add an access token for Sourcegraph Self-Hosted in your preferences!\n\n${tryCloudMessage}`}
      />
    );
  }

  return command(src);
}
