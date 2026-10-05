import { Action, ActionPanel, Clipboard, Color, Icon, Image, Keyboard, List, showHUD } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { ReactElement, useState } from "react";
import { Generated, titleCase } from "../lib/types";
import { preferences, preferredValue } from "../preferences";

export interface GeneratorItem {
  id: string;
  title: string;
  icon?: Image.ImageLike;
  keywords?: string[];
  section?: string;
  /** Short text shown on the right, e.g. bank name or "US Employer Identification Number". */
  accessory?: (value: Generated) => List.Item.Accessory[];
  generate: () => Generated | undefined;
}

interface Props {
  items: GeneratorItem[];
  namespace: string;
  searchBarPlaceholder: string;
  /** Changing this regenerates every value (e.g. when a dropdown switches mobile/landline). */
  generationKey?: string;
  searchBarAccessory?: ReactElement<List.Dropdown.Props>;
}

type Values = Record<string, Generated | undefined>;

function generateAll(items: GeneratorItem[]): Values {
  return Object.fromEntries(items.map((item) => [item.id, item.generate()]));
}

export function GeneratorList({
  items,
  namespace,
  searchBarPlaceholder,
  generationKey = "",
  searchBarAccessory,
}: Props) {
  const [state, setState] = useState(() => ({ key: generationKey, values: generateAll(items) }));
  const [showDetail, setShowDetail] = useState(false);
  const { data: sorted, visitItem, resetRanking } = useFrecencySorting(items, { namespace, key: (item) => item.id });

  // Derived state: regenerate synchronously when the generation key changes.
  let values = state.values;
  if (state.key !== generationKey) {
    values = generateAll(items);
    setState({ key: generationKey, values });
  }

  const regenerate = (item: GeneratorItem) =>
    setState((s) => ({ ...s, values: { ...s.values, [item.id]: item.generate() } }));
  const regenerateAll = () => setState((s) => ({ ...s, values: generateAll(items) }));

  const sections = new Map<string, GeneratorItem[]>();
  for (const item of sorted) {
    const key = item.section ?? "";
    sections.set(key, [...(sections.get(key) ?? []), item]);
  }

  return (
    <List
      searchBarPlaceholder={searchBarPlaceholder}
      isShowingDetail={showDetail}
      searchBarAccessory={searchBarAccessory}
    >
      {[...sections.entries()].map(([title, sectionItems]) => (
        <List.Section key={title || "default"} title={title || undefined}>
          {sectionItems.map((item) => {
            const value = values[item.id];
            if (!value) return null;
            return (
              <List.Item
                key={item.id}
                id={item.id}
                icon={item.icon}
                title={item.title}
                subtitle={showDetail ? undefined : value.formatted}
                keywords={item.keywords}
                accessories={showDetail ? undefined : item.accessory?.(value)}
                detail={<ValueDetail value={value} />}
                actions={
                  <ValueActions
                    value={value}
                    onCopy={() => {
                      visitItem(item);
                      // Fresh value next time, even if Raycast restores this view instead of popping to root.
                      regenerate(item);
                    }}
                    onCopyVariant={() => visitItem(item)}
                    onRegenerate={() => regenerate(item)}
                    onRegenerateAll={regenerateAll}
                    onToggleDetail={() => setShowDetail((v) => !v)}
                    onCopyMany={() => copyMany(item)}
                    onResetRanking={() => resetRanking(item)}
                  />
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

async function copyMany(item: GeneratorItem) {
  const lines = Array.from({ length: 10 }, () => item.generate())
    .filter((v): v is Generated => !!v)
    .map(preferredValue);
  await Clipboard.copy(lines.join("\n"));
  await showHUD(`Copied 10 × ${item.title}`);
}

function ValueDetail({ value }: { value: Generated }) {
  return (
    <List.Item.Detail
      markdown={`## ${value.formatted}\n\n\`${value.compact}\``}
      metadata={
        value.fields?.length ? (
          <List.Item.Detail.Metadata>
            {value.fields.map((field) => (
              <List.Item.Detail.Metadata.Label key={field.label} title={field.label} text={field.value} />
            ))}
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  );
}

interface ActionsProps {
  value: Generated;
  /** Main value copied/pasted: counts as a visit and rolls a new value. */
  onCopy: () => void;
  /** Variant copied (BIC, BBAN, …): keeps the current value so related parts still match. */
  onCopyVariant: () => void;
  onRegenerate: () => void;
  onRegenerateAll: () => void;
  onToggleDetail: () => void;
  onCopyMany: () => void;
  onResetRanking: () => void;
}

function ValueActions(props: ActionsProps) {
  const { value } = props;
  const compactFirst = preferences().copyFormat !== "formatted";
  const primary = compactFirst ? value.compact : value.formatted;
  const secondary = compactFirst ? value.formatted : value.compact;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy" content={primary} onCopy={props.onCopy} />
        <Action.Paste title="Paste into Active App" content={primary} onPaste={props.onCopy} />
        {secondary !== primary && (
          <Action.CopyToClipboard
            title={compactFirst ? "Copy Formatted" : "Copy Compact"}
            content={secondary}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onCopy={props.onCopy}
          />
        )}
        {value.variants?.map((variant, i) => (
          <Action.CopyToClipboard
            key={variant.label}
            title={titleCase(`Copy ${variant.label}`)}
            content={variant.value}
            shortcut={i < 9 ? { modifiers: ["cmd"], key: String(i + 1) as Keyboard.KeyEquivalent } : undefined}
            onCopy={props.onCopyVariant}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Regenerate"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={props.onRegenerate}
        />
        <Action
          title="Regenerate All"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={props.onRegenerateAll}
        />
        <Action
          title="Copy 10 New Values"
          icon={Icon.CopyClipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          onAction={props.onCopyMany}
        />
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          onAction={props.onToggleDetail}
        />
        <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={props.onResetRanking} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export const TAG = {
  fictional: { tag: { value: "fictional", color: Color.Green } },
  random: { tag: { value: "random", color: Color.Orange } },
};
