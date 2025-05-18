import { ActionPanel, Action } from "@raycast/api";
import { StreamingProviders } from "../types";
import { Image } from "@raycast/api";
import { getProviderIcon } from "../utils";

export function ProviderActions({ providers }: { providers: StreamingProviders }) {
  return (
    <ActionPanel.Section title="Streaming Options">
      {providers.map((provider, index) => (
        <Action.OpenInBrowser
          key={`${provider.name}-${index}`}
          title={`${provider.name} ${provider.price ? `(${provider.price} ${provider.type})` : "(free)"}`}
          url={provider.web_url}
          icon={{ source: getProviderIcon(provider), mask: Image.Mask.RoundedRectangle }}
        />
      ))}
    </ActionPanel.Section>
  );
}
