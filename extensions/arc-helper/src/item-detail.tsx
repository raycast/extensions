import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ReactNode } from "react";
import { API, ItemRef, ItemWithRelations, MetaForgeUrl, PaginatedResponse, apiUrl } from "./api";
import { formatNumber, formatStatName, htmlToMarkdown, iconMarkdown, itemTable, section } from "./format";
import { getMapName } from "./maps";
import { GuideActions, RarityMetadata, itemIcon, loadFailure } from "./ui";

export type ItemPreview = Pick<ItemRef, "id" | "name" | "icon"> & Partial<ItemWithRelations>;

interface ItemDetailProps {
  id: string;
  /** Data already on hand, shown while the full item loads. */
  preview?: ItemPreview;
  /** Markdown inserted after the description, e.g. blueprint collection status or trader pricing. */
  extraMarkdown?: string;
  extraMetadata?: ReactNode;
  /** Additional `ActionPanel.Section`s, shown after the item's own actions. */
  extraActions?: ReactNode;
}

function statsTable(stats: ItemWithRelations["stat_block"] | undefined): string {
  const relevant = Object.entries(stats ?? {}).filter(
    ([, value]) => value !== 0 && value !== "" && value !== null && value !== undefined,
  );
  if (relevant.length === 0) return "";
  return [
    "| Stat | Value |",
    "|---|---|",
    ...relevant.map(([key, value]) => `| ${formatStatName(key)} | ${value} |`),
  ].join("\n");
}

function cosmeticMarkdown(item: Partial<ItemWithRelations>): string {
  const cosmetic = item.cosmetic;
  if (!cosmetic) return "";
  const lines = cosmetic.parentName ? [`Variant of **${cosmetic.parentName}**`, ""] : [];
  for (const setting of cosmetic.settings ?? []) {
    lines.push(`- **${setting.name}:** ${setting.options.map((option) => option.name).join(", ")}`);
  }
  return lines.join("\n");
}

/** Every item this item links to, for the "View Related Item" submenu. */
function relatedItems(item: Partial<ItemWithRelations>): ItemRef[] {
  return [
    ...(item.components ?? []).map((entry) => entry.component),
    ...(item.recycle_components ?? []).map((entry) => entry.component),
    ...(item.used_in ?? []).map((entry) => entry.item),
    ...(item.recycle_from ?? []).map((entry) => entry.item),
    ...(item.mods ?? []).map((entry) => entry.mod),
  ].filter((ref): ref is ItemRef => !!ref?.id);
}

export function ItemDetail({ id, preview, extraMarkdown, extraMetadata, extraActions }: ItemDetailProps) {
  const { data, isLoading } = useFetch(apiUrl(API.items, { ids: id, includeComponents: "true" }), {
    mapResult: (result: PaginatedResponse<ItemWithRelations>) => ({
      data: result.data.find((entry) => entry.id === id),
    }),
    failureToastOptions: loadFailure("item details"),
  });

  const item: Partial<ItemWithRelations> = { ...preview, ...data };
  const name = item.name ?? id;
  const maps = [...new Set((item.locations ?? []).map((location) => getMapName(location.map)))];
  const subcategory = item.subcategory && item.subcategory !== item.item_type ? item.subcategory : null;

  const markdown = [
    `# ${name}`,
    iconMarkdown(item.icon, 96),
    item.description || (isLoading ? "" : "No description available."),
    item.flavor_text ? `> ${item.flavor_text}` : "",
    extraMarkdown ?? "",
    section("Overview", htmlToMarkdown(item.article)),
    section("Stats", statsTable(item.stat_block)),
    section(
      "Crafting Recipe",
      itemTable((item.components ?? []).map((entry) => ({ item: entry.component, quantity: entry.quantity }))),
    ),
    section(
      "Recycles Into",
      itemTable((item.recycle_components ?? []).map((entry) => ({ item: entry.component, quantity: entry.quantity }))),
    ),
    section(
      "Obtained by Recycling",
      itemTable((item.recycle_from ?? []).map((entry) => ({ item: entry.item, quantity: entry.quantity }))),
    ),
    section(
      "Used to Craft",
      itemTable((item.used_in ?? []).map((entry) => ({ item: entry.item, quantity: entry.quantity }))),
    ),
    section("Compatible Mods", itemTable((item.mods ?? []).map((entry) => ({ item: entry.mod })))),
    section(
      "Dropped By",
      (item.dropped_by ?? [])
        .filter((entry) => entry.arc)
        .map((entry) => `- ${iconMarkdown(entry.arc.icon)} ${entry.arc.name}`)
        .join("\n"),
    ),
    section(
      "Sold By",
      (item.sold_by ?? []).map((entry) => `- **${entry.trader_name}** — ${formatNumber(entry.price)} coins`).join("\n"),
    ),
    section("Customization", cosmeticMarkdown(item)),
    section("Found On", maps.map((map) => `- ${map}`).join("\n")),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {extraMetadata}
          {item.item_type && <Detail.Metadata.Label title="Type" text={item.item_type} />}
          {subcategory && <Detail.Metadata.Label title="Subcategory" text={subcategory} />}
          <RarityMetadata rarity={item.rarity} />
          {typeof item.value === "number" && (
            <Detail.Metadata.Label title="Value" text={formatNumber(item.value)} icon={Icon.Coins} />
          )}
          {item.workbench && <Detail.Metadata.Label title="Workbench" text={item.workbench} />}
          {item.loot_area && <Detail.Metadata.Label title="Loot Area" text={item.loot_area} />}
          {item.ammo_type && <Detail.Metadata.Label title="Ammo Type" text={item.ammo_type} />}
          {item.shield_type && <Detail.Metadata.Label title="Shield Type" text={item.shield_type} />}
          {!!item.loadout_slots?.length && (
            <Detail.Metadata.Label title="Loadout Slots" text={item.loadout_slots.join(", ")} />
          )}
          {item.unlocks_weapon && <Detail.Metadata.Label title="Unlocks Weapon" text="Yes" icon={Icon.Lock} />}
          {item.cosmetic?.kind && <Detail.Metadata.Label title="Cosmetic" text={item.cosmetic.kind} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="MetaForge" target={MetaForgeUrl.item(id)} text="View on MetaForge" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={MetaForgeUrl.item(id)} />
          <GuideActions links={item.guide_links} url={item.guide_url} />
          <ViewItemsSubmenu title="View Related Item" items={relatedItems(item)} />
          <Action.CopyToClipboard title="Copy Item Name" content={name} />
          {extraActions}
        </ActionPanel>
      }
    />
  );
}

/** Submenu that pushes the detail view of any item referenced by the current entry. */
export function ViewItemsSubmenu({ title = "View Item", items }: { title?: string; items: ItemRef[] }) {
  const unique = [...new Map(items.filter((item) => item?.id).map((item) => [item.id, item])).values()];
  if (unique.length === 0) return null;
  return (
    <ActionPanel.Submenu
      title={`${title}…`}
      icon={Icon.MagnifyingGlass}
      shortcut={{ macOS: { modifiers: ["cmd"], key: "i" }, Windows: { modifiers: ["ctrl"], key: "i" } }}
    >
      {unique.map((item) => (
        <Action.Push
          key={item.id}
          title={item.name}
          icon={itemIcon(item.icon)}
          target={<ItemDetail id={item.id} preview={item} />}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
