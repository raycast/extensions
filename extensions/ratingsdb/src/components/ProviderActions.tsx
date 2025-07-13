import { ActionPanel, Action } from "@raycast/api";
import { StreamingProvider } from "../types";
import { Image } from "@raycast/api";
import { getProviderIcon } from "../utils";

export function ProviderActions({ providers }: { providers: StreamingProvider[] }) {
  return (
    <ActionPanel.Section title="Streaming Options">
      {providers.map((provider) => (
        <Action.OpenInBrowser
          key={provider.name}
          title={`${provider.name} (${provider.type === "rent" ? provider.price : provider.type})`}
          url={provider.web_url}
          icon={{ source: getProviderIcon(provider), mask: Image.Mask.RoundedRectangle }}
        />
      ))}
    </ActionPanel.Section>
  );
}
