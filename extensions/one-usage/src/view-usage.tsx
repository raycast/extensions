import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { PROVIDER_META, fetchAllProviders } from "./providers/registry";
import { MetricLine } from "./types";
import { formatProgressBar, formatProgressValue } from "./utils";

// List Item Helpers

function getProviderIcon(providerId: string): Image.ImageLike {
  return PROVIDER_META[providerId]?.icon ?? { source: Icon.Info, tintColor: Color.PrimaryText };
}

function getLineTitle(line: MetricLine): string {
  if (line.type === "text") {
    return `${line.label}: ${line.value}`;
  }
  return line.label;
}

function getLineSubtitle(line: MetricLine): string | undefined {
  if (line.type !== "progress") return undefined;

  const percentage = line.max > 0 ? Math.round((line.value / line.max) * 100) : 0;
  const valueText = formatProgressValue(line.value, line.max, line.unit);
  return `${formatProgressBar(percentage)} ${valueText}`;
}

function getLineAccessories(line: MetricLine): List.Item.Accessory[] {
  if (line.type === "progress" && line.subtitle) {
    return [{ text: { value: line.subtitle, color: Color.SecondaryText } }];
  }
  if (line.type === "badge") {
    return [{ tag: { value: line.text, color: Color.Blue } }];
  }
  return [];
}

// Reusable Action Panel

function ProviderActions(props: { providerId: string; providerName: string; onRefresh: () => void }) {
  const meta = PROVIDER_META[props.providerId];
  return (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={props.onRefresh} />
      {meta && <Action.OpenInBrowser title={`Open ${props.providerName}`} url={meta.url} />}
    </ActionPanel>
  );
}

// Component

export default function ViewUsage() {
  const { data, isLoading, revalidate } = usePromise(fetchAllProviders);

  return (
    <List isLoading={isLoading}>
      {data && data.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Providers Enabled"
          description="Enable at least one provider in the extension preferences."
          icon={Icon.Gear}
        />
      )}
      {data?.map((result) => (
        <List.Section key={result.id} title={result.name} subtitle={result.error ? "⚠️ Error" : undefined}>
          {result.error ? (
            <List.Item
              title={result.error}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              accessories={PROVIDER_META[result.id] ? [{ icon: PROVIDER_META[result.id].icon }] : []}
              actions={<ProviderActions providerId={result.id} providerName={result.name} onRefresh={revalidate} />}
            />
          ) : (
            result.lines?.map((line, i) => (
              <List.Item
                key={`${line.type}-${line.label}-${i}`}
                title={getLineTitle(line)}
                subtitle={getLineSubtitle(line)}
                icon={getProviderIcon(result.id)}
                accessories={getLineAccessories(line)}
                actions={<ProviderActions providerId={result.id} providerName={result.name} onRefresh={revalidate} />}
              />
            ))
          )}
        </List.Section>
      ))}
    </List>
  );
}
