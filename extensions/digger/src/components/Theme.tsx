import { Action, Color, Icon, Image, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { Actions } from "../actions";
import { DiggerResult, ThemeColor, ThemeData } from "../types";
import { toHex } from "../utils/colorUtils";
import { resolveUrl } from "../utils/urlUtils";
import { ThemeTokensListView } from "./ThemeTokensListView";

/** Tokens shown inline before the list view takes over. */
const TOKEN_PREVIEW = 10;

interface ThemeProps {
  data: DiggerResult | null;
  onRefresh: () => void;
  progress: number;
}

/**
 * A swatch for the colour, when Raycast can render one.
 *
 * `Image.Mask`-free coloured dots only accept a hex value, so a token written as
 * `oklch(...)` or `color-mix(...)` gets a neutral icon rather than a wrong one.
 */
export function swatchFor(value: string, computed?: string): Image.ImageLike {
  // `computed` is the value converted to hex — oklch(), lab(), a resolved var().
  // Without it every modern token drew an empty circle.
  const trimmed = (computed ?? value).trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(trimmed);
  if (!hex) return { source: Icon.Circle };

  // Raycast tints have no alpha channel, so a translucent colour could only be
  // shown as its opaque RGB — a different colour. Hollow circle instead; the
  // exact value is still printed on the row.
  const alpha = hex[1].length === 8 ? hex[1].slice(6) : hex[1].length === 4 ? hex[1].slice(3) : undefined;
  if (alpha !== undefined && alpha.toLowerCase() !== "ff" && alpha.toLowerCase() !== "f") {
    return { source: Icon.Circle };
  }

  const swatch = hex[1].length > 4 ? `#${hex[1].slice(0, 6)}` : `#${hex[1].slice(0, 3)}`;
  return {
    source: Icon.CircleFilled,
    // `adjustContrast` defaults to TRUE, which lightens dark tints and darkens
    // light ones so they stay legible against the background. That is right for
    // an icon and wrong for a swatch: it would show a colour the site does not
    // use. Same fix the tw-colorsearch extension applies.
    tintColor: { light: swatch, dark: swatch, adjustContrast: false },
  };
}

/**
 * Condenses a media query into a label that leaves room for the value.
 *
 * Raycast gives the title as much width as it wants and truncates the VALUE, so
 * base-ui.com's `(prefers-color-scheme: light) and (min-width: 1024px)` reduced
 * `oklch(95% 0.25% 264)` to `o…)`. The colour is the point of the row; the query
 * is the qualifier.
 */
function describeMedia(media: string): string {
  const parts: string[] = [];
  const scheme = /prefers-color-scheme\s*:\s*(light|dark)/i.exec(media);
  if (scheme) parts.push(scheme[1].toLowerCase());

  const min = /min-width\s*:\s*([\d.]+)(px|rem|em)/i.exec(media);
  if (min) parts.push(`≥${min[1]}${min[2]}`);
  const max = /max-width\s*:\s*([\d.]+)(px|rem|em)/i.exec(media);
  if (max) parts.push(`≤${max[1]}${max[2]}`);

  if (/prefers-contrast\s*:\s*more/i.test(media)) parts.push("high contrast");
  if (/prefers-reduced-motion/i.test(media)) parts.push("reduced motion");

  // Nothing recognised: keep the query, but short enough to leave the value room.
  if (parts.length === 0) return media.length > 24 ? `${media.slice(0, 23)}…` : media;
  return parts.join(" · ");
}

function colorRow(key: string, title: string, color: ThemeColor) {
  return (
    <List.Item.Detail.Metadata.Label
      key={key}
      title={title}
      text={color.value}
      icon={swatchFor(color.value, color.hex ?? toHex(color.value))}
    />
  );
}

export function Theme({ data, onRefresh, progress }: ThemeProps) {
  const isLoading = progress < 1;
  const listIcon = isLoading ? getProgressIcon(progress, Color.Blue) : Icon.Swatch;
  const theme = data?.theme;
  const stylesheetUrls = (data?.resources?.stylesheets ?? [])
    .map((sheet) => resolveUrl(sheet.href, data!.url))
    .filter((href) => /^https?:/.test(href));

  const count = theme ? theme.themeColors.length + theme.vendorColors.length + theme.tokens.length : 0;

  return (
    <List.Item
      title="Theme"
      icon={listIcon}
      accessories={
        count > 0 ? [{ text: `${count}` }, { icon: { source: Icon.Check, tintColor: Color.Green } }] : undefined
      }
      detail={<ThemeDetail theme={theme} isLoading={isLoading} hasData={data !== null} />}
      actions={
        data ? (
          <Actions
            data={data}
            url={data.url}
            onRefresh={onRefresh}
            sectionActionsFirst
            sectionActions={
              theme && (theme.tokens.length > 0 || stylesheetUrls.length > 0) ? (
                <Action.Push
                  title="View All Color Tokens"
                  icon={Icon.Swatch}
                  target={<ThemeTokensListView theme={theme} stylesheetUrls={stylesheetUrls} pageUrl={data!.url} />}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "return" },
                    Windows: { modifiers: ["ctrl"], key: "return" },
                  }}
                />
              ) : undefined
            }
          />
        ) : undefined
      }
    />
  );
}

function ThemeDetail({ theme, isLoading, hasData }: { theme?: ThemeData; isLoading: boolean; hasData: boolean }) {
  if (!hasData || (isLoading && !theme)) {
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Reading theme declarations…" icon={Icon.Clock} />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  // The markup WAS read; it declared nothing. That is an answer about the page,
  // not a check that failed, so it may be stated plainly.
  if (!theme) {
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Theme"
              text="No theme declared"
              icon={{ source: Icon.Xmark, tintColor: Color.Red }}
            />
            <List.Item.Detail.Metadata.Label
              title=""
              text="This page declares no theme-color, color-scheme, or color tokens in its markup."
            />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  const { themeColors, colorScheme, schemeClass, statusBarStyle, attributes, vendorColors, tokens, stylesheets } =
    theme;
  const attributeEntries = Object.entries(attributes);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Color Scheme" />
          {colorScheme ? (
            <List.Item.Detail.Metadata.Label title="color-scheme" text={colorScheme} />
          ) : (
            <List.Item.Detail.Metadata.Label
              title="color-scheme"
              text="Not declared"
              icon={{ source: Icon.Xmark, tintColor: Color.SecondaryText }}
            />
          )}
          {schemeClass && <List.Item.Detail.Metadata.Label title="Class on <html>" text={schemeClass} />}
          {statusBarStyle && <List.Item.Detail.Metadata.Label title="iOS status bar" text={statusBarStyle} />}

          {themeColors.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {themeColors.length > 0 && <List.Item.Detail.Metadata.Label title="Browser Chrome" />}
          {themeColors.map((color, i) =>
            colorRow(`tc-${i}`, color.media ? `theme-color (${describeMedia(color.media)})` : "theme-color", color),
          )}
          {vendorColors.map((color, i) => colorRow(`vc-${i}`, color.name ?? "vendor", color))}

          {attributeEntries.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {attributeEntries.length > 0 && <List.Item.Detail.Metadata.Label title="Declared on <html>" />}
          {attributeEntries.map(([name, value]) => (
            <List.Item.Detail.Metadata.Label key={name} title={name} text={value} />
          ))}

          {(tokens.length > 0 || stylesheets) && <List.Item.Detail.Metadata.Separator />}
          {tokens.length > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Color Tokens"
              text={stylesheets?.truncated ? `${tokens.length} (capped)` : `${tokens.length}`}
            />
          )}
          {/* 200 rows do not belong in a detail pane; the rest are one ⏎ away. */}
          {tokens
            .slice(0, TOKEN_PREVIEW)
            .map((token) => colorRow(token.name ?? token.value, token.name ?? "token", token))}
          {tokens.length > TOKEN_PREVIEW && (
            <List.Item.Detail.Metadata.Label
              title={`…and ${tokens.length - TOKEN_PREVIEW} more`}
              text="⌘↩ to view all"
            />
          )}
          {stylesheets && (
            <List.Item.Detail.Metadata.Label
              title="Stylesheets Read"
              text={
                stylesheets.linked > stylesheets.scanned + stylesheets.unchecked
                  ? `${stylesheets.scanned} of ${stylesheets.scanned + stylesheets.unchecked} tried · ${stylesheets.linked} linked`
                  : `${stylesheets.scanned} of ${stylesheets.linked}`
              }
            />
          )}
          {/* A sheet that failed has unknown tokens, not zero. */}
          {stylesheets && stylesheets.unchecked > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Couldn't Read"
              text={`${stylesheets.unchecked} stylesheet${stylesheets.unchecked === 1 ? "" : "s"}`}
              icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
