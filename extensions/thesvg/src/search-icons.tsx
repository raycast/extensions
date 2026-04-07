import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  searchIcons,
  getIcon,
  getCategories,
  getIconUrl,
  getIconPageUrl,
  getCdnUrl,
  type IconEntry,
} from "./api";

export default function SearchIcons() {
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState("all");

  const { data: categories, error: categoriesError } =
    useCachedPromise(getCategories);

  const {
    data,
    isLoading,
    error: iconsError,
  } = useCachedPromise(searchIcons, [searchText || undefined, category, 100], {
    keepPreviousData: true,
  });

  const loadError = categoriesError ?? iconsError;
  const errorMessage =
    loadError instanceof Error ? loadError.message : "Please try again.";
  const icons = data?.icons ?? [];

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search 4,000+ brand icons..."
      filtering={false}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by category"
          value={category}
          onChange={setCategory}
        >
          <List.Dropdown.Item title="All Categories" value="all" />
          <List.Dropdown.Section title="Categories">
            {(categories ?? []).map((cat) => (
              <List.Dropdown.Item
                key={cat.name}
                title={`${cat.name} (${cat.count})`}
                value={cat.name}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {loadError ? (
        <List.EmptyView
          title="Could not load icons"
          description={errorMessage}
          icon={Icon.ExclamationMark}
        />
      ) : (
        icons.map((icon) => <IconListItem key={icon.slug} icon={icon} />)
      )}
      {!loadError && icons.length === 0 && !isLoading && (
        <List.EmptyView
          title="No icons found"
          description={
            searchText
              ? `No results for "${searchText}"`
              : "Try a different category"
          }
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

function IconListItem({ icon }: { icon: IconEntry }) {
  const iconUrl = getIconUrl(icon.slug);

  return (
    <List.Item
      id={icon.slug}
      title={icon.title}
      subtitle={icon.categories.slice(0, 2).join(", ")}
      icon={{ source: iconUrl, fallback: Icon.Image }}
      accessories={[
        ...(icon.variants.length > 1
          ? [{ text: `${icon.variants.length} variants`, icon: Icon.Layers }]
          : []),
      ]}
      keywords={[icon.slug, ...icon.categories]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <CopySvgAction slug={icon.slug} title={icon.title} />
            <Action.CopyToClipboard
              title="Copy Direct URL"
              content={getIconUrl(icon.slug)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy JsDelivr URL"
              content={getCdnUrl(icon.slug)}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open on TheSVG"
              url={getIconPageUrl(icon.slug)}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<IconDetailView slug={icon.slug} />}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function CopySvgAction({ slug, title }: { slug: string; title: string }) {
  const { defaultVariant } = getPreferenceValues<Preferences>();

  return (
    <Action
      title="Copy SVG"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
      onAction={async () => {
        try {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Fetching SVG...",
          });
          const detail = await getIcon(slug);
          const variant =
            detail.variants[defaultVariant] ?? detail.variants["default"];
          if (variant?.svg) {
            await Clipboard.copy(variant.svg);
            toast.style = Toast.Style.Success;
            toast.title = `Copied ${title} SVG`;
          } else {
            toast.style = Toast.Style.Failure;
            toast.title = "SVG not available";
          }
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to copy SVG",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }}
    />
  );
}

function escapeMarkdown(text: string): string {
  return text.replace(/[[\]()#*`\\>_~|!]/g, "\\$&");
}

function isVisibleHex(hex: string): boolean {
  const lower = hex.toLowerCase();
  return (
    lower !== "fff" &&
    lower !== "ffffff" &&
    lower !== "000" &&
    lower !== "000000"
  );
}

function toTitleCase(text: string): string {
  return text
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function IconDetailView({ slug }: { slug: string }) {
  const { data: icon, isLoading } = useCachedPromise(getIcon, [slug]);

  if (!icon) {
    return <Detail isLoading={isLoading} markdown="Loading icon details..." />;
  }

  const variantKeys = Object.keys(icon.variants);
  const defaultSvg = icon.variants["default"]?.svg ?? "";
  const svgPreview = defaultSvg
    ? `<img src="${getIconUrl(slug)}" width="128" height="128" />`
    : "";

  const safeTitle = escapeMarkdown(icon.title);
  const markdown = `
# ${safeTitle}

${svgPreview}

## Variants (${variantKeys.length})

${variantKeys.map((v) => `- \`${escapeMarkdown(v)}\` - [Preview](${getIconUrl(encodeURIComponent(slug), encodeURIComponent(v))})`).join("\n")}

## SVG Source

\`\`\`xml
${defaultSvg.substring(0, 2000)}${defaultSvg.length > 2000 ? "\n... (truncated)" : ""}
\`\`\`
`;

  const hexVisible = icon.hex && isVisibleHex(icon.hex);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Slug" text={slug} />
          {hexVisible && (
            <Detail.Metadata.Label
              title="Color"
              text={`#${icon.hex}`}
              icon={{
                source: Icon.CircleFilled,
                tintColor: `#${icon.hex}` as Color,
              }}
            />
          )}
          <Detail.Metadata.TagList title="Categories">
            {icon.categories.map((cat) => (
              <Detail.Metadata.TagList.Item key={cat} text={cat} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Variants"
            text={variantKeys.join(", ")}
          />
          <Detail.Metadata.Separator />
          {icon.url && (
            <Detail.Metadata.Link
              title="Website"
              text={icon.url}
              target={icon.url}
            />
          )}
          <Detail.Metadata.Link
            title="theSVG Page"
            text={`thesvg.org/icon/${slug}`}
            target={getIconPageUrl(slug)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Direct URL" text={getIconUrl(slug)} />
          <Detail.Metadata.Label title="jsDelivr" text={getCdnUrl(slug)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            {variantKeys.map((variant) => (
              <Action
                key={variant}
                title={`Copy ${toTitleCase(variant)} SVG`}
                icon={Icon.Clipboard}
                onAction={async () => {
                  const svg = icon.variants[variant]?.svg;
                  if (svg) {
                    await Clipboard.copy(svg);
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Copied ${icon.title} (${variant})`,
                    });
                  }
                }}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy URLs">
            <Action.CopyToClipboard
              title="Copy Direct URL"
              content={getIconUrl(slug)}
            />
            <Action.CopyToClipboard
              title="Copy JsDelivr URL"
              content={getCdnUrl(slug)}
            />
            {hexVisible && (
              <Action.CopyToClipboard
                title="Copy Color"
                content={`#${icon.hex}`}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open on TheSVG"
              url={getIconPageUrl(slug)}
            />
            {icon.url && (
              <Action.OpenInBrowser title="Open Brand Website" url={icon.url} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
