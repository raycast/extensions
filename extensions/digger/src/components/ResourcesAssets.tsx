import { List, Icon, Color, Action } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { DiggerResult, FontAsset } from "../types";
import { getFontDisplayName } from "../utils/fontUtils";
import { Actions } from "../actions";
import { ResourcesViewActions } from "../actions/ResourceViewActions";
import { truncateText } from "../utils/formatters";
import { getDeniedAccessMessage } from "../utils/botDetection";
import { ResourcesListView } from "./ResourcesListView";
import { ImagesGridView, getUniqueImageCount } from "./ImagesGridView";
import { resolveUrl } from "../utils/urlUtils";

interface ResourcesAssetsProps {
  data: DiggerResult | null;
  onRefresh: () => void;
  progress: number;
}

export function ResourcesAssets({ data, onRefresh, progress }: ResourcesAssetsProps) {
  // Show progress icon until this section is complete
  const isLoading = progress < 1;

  if (!data) {
    return (
      <List.Item
        title="Resources & Assets"
        icon={isLoading ? getProgressIcon(progress, Color.Blue) : Icon.Code}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Scanning resources..." />
                <List.Item.Detail.Metadata.Label title="" text="Finding stylesheets, scripts, and images" />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }

  const { resources, botProtection } = data;
  const isChallengePage = botProtection?.isChallengePage ?? false;

  const hasStylesheets = !!(resources?.stylesheets && resources.stylesheets.length > 0);
  const hasScripts = !!(resources?.scripts && resources.scripts.length > 0);
  const hasImages = !!(resources?.images && resources.images.length > 0);
  const hasFonts = !!(resources?.fonts && resources.fonts.length > 0);
  const hasResources = hasStylesheets || hasScripts || hasImages || hasFonts;

  // Get unique image count for display
  const uniqueImageCount = getUniqueImageCount(resources?.images);

  const counts = [];
  if (hasStylesheets) counts.push(`${resources!.stylesheets!.length} CSS`);
  if (hasScripts) counts.push(`${resources!.scripts!.length} JS`);
  if (hasImages) counts.push(`${uniqueImageCount} Images`);
  if (hasFonts) counts.push(`${resources!.fonts!.length} Fonts`);

  // Check if we should show "View All" action (>5 resources in any category)
  const stylesheetsCount = resources?.stylesheets?.length ?? 0;
  const scriptsCount = resources?.scripts?.length ?? 0;
  const fontsCount = resources?.fonts?.length ?? 0;
  const feedsCount =
    (data.dataFeeds?.rss?.length ?? 0) + (data.dataFeeds?.atom?.length ?? 0) + (data.dataFeeds?.json?.length ?? 0);
  const hasMany = stylesheetsCount > 5 || scriptsCount > 5 || feedsCount > 5 || fontsCount > 5;

  // Show progress icon while loading, then show document icon
  const listIcon = isLoading ? getProgressIcon(progress, Color.Blue) : Icon.Code;

  return (
    <List.Item
      title="Resources & Assets"
      icon={listIcon}
      accessories={
        isChallengePage
          ? [{ icon: { source: Icon.ExclamationMark, tintColor: Color.Orange } }]
          : hasResources
            ? [{ icon: { source: Icon.Check, tintColor: Color.Green } }]
            : undefined
      }
      detail={
        <ResourcesAssetsDetail
          data={data}
          hasStylesheets={hasStylesheets}
          hasScripts={hasScripts}
          hasImages={hasImages}
          hasFonts={hasFonts}
          isChallengePage={isChallengePage}
          uniqueImageCount={uniqueImageCount}
        />
      }
      actions={
        <Actions
          data={data}
          url={data.url}
          onRefresh={onRefresh}
          sectionActions={
            <>
              {hasImages && (
                <Action.Push
                  title="View All Images"
                  icon={Icon.Image}
                  target={<ImagesGridView images={resources!.images!} siteUrl={data.url} />}
                />
              )}
              <ResourcesViewActions
                data={data}
                hasFonts={hasFonts}
                hasStylesheets={hasStylesheets}
                hasScripts={hasScripts}
              />
              {hasMany && (
                <Action.Push title="View All Resources" icon={Icon.List} target={<ResourcesListView data={data} />} />
              )}
            </>
          }
        />
      }
    />
  );
}

interface ResourcesAssetsDetailProps {
  data: DiggerResult;
  hasStylesheets: boolean;
  hasScripts: boolean;
  hasImages: boolean;
  hasFonts: boolean;
  isChallengePage: boolean;
  uniqueImageCount: number;
}

function ResourcesAssetsDetail({
  data,
  hasStylesheets,
  hasScripts,
  hasImages,
  hasFonts,
  isChallengePage,
  uniqueImageCount,
}: ResourcesAssetsDetailProps) {
  const { resources, botProtection } = data;
  const deniedMessage = getDeniedAccessMessage(botProtection?.provider);
  const hasThemeColor = !!resources?.themeColor;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {hasThemeColor && (
            <>
              <List.Item.Detail.Metadata.TagList title="Theme Color">
                <List.Item.Detail.Metadata.TagList.Item
                  text={resources!.themeColor!}
                  color={resources!.themeColor! as Color.ColorLike}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          <List.Item.Detail.Metadata.Label
            title={`Images${hasImages ? ` (${uniqueImageCount} unique)` : ""}`}
            icon={
              isChallengePage
                ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
                : hasImages
                  ? { source: Icon.Check, tintColor: Color.Green }
                  : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          {hasImages &&
            (() => {
              // Deduplicate by URL (without query string) for display
              const seen = new Set<string>();
              const uniqueForDisplay = resources!.images!.filter((img) => {
                const urlWithoutQuery = img.src.split("?")[0];
                if (seen.has(urlWithoutQuery)) return false;
                seen.add(urlWithoutQuery);
                return true;
              });
              return (
                <>
                  {uniqueForDisplay.slice(0, 5).map((img, index) => {
                    // Extract filename and strip query string
                    const urlWithoutQuery = img.src.split("?")[0];
                    const filename = urlWithoutQuery.split("/").pop() || img.src;
                    const absoluteUrl = resolveUrl(img.src, data.url);
                    return (
                      <List.Item.Detail.Metadata.Link
                        key={index}
                        title={img.type ? img.type : img.alt ? truncateText(img.alt, 20) : "No alt"}
                        target={absoluteUrl}
                        text={filename}
                      />
                    );
                  })}
                  {uniqueForDisplay.length > 5 && (
                    <List.Item.Detail.Metadata.Label title="" text={`...and ${uniqueForDisplay.length - 5} more`} />
                  )}
                </>
              );
            })()}
          {!hasImages && (
            <List.Item.Detail.Metadata.Label title="" text={isChallengePage ? deniedMessage : "No images found"} />
          )}

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={`Fonts${hasFonts ? ` (${resources!.fonts!.length})` : ""}`}
            icon={
              isChallengePage
                ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
                : hasFonts
                  ? { source: Icon.Check, tintColor: Color.Green }
                  : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          {hasFonts &&
            resources!.fonts!.slice(0, 5).map((font: FontAsset, index: number) => {
              const displayName = getFontDisplayName(font);
              const formatText = font.format ? font.format.toUpperCase() : "Font";
              const absoluteUrl = resolveUrl(font.url, data.url);
              return (
                <List.Item.Detail.Metadata.Link
                  key={index}
                  title={displayName}
                  target={absoluteUrl}
                  text={formatText}
                />
              );
            })}
          {hasFonts && resources!.fonts!.length > 5 && (
            <List.Item.Detail.Metadata.Label title="" text={`...and ${resources!.fonts!.length - 5} more`} />
          )}
          {!hasFonts && (
            <List.Item.Detail.Metadata.Label title="" text={isChallengePage ? deniedMessage : "No fonts found"} />
          )}

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={`Stylesheets${hasStylesheets ? ` (${resources!.stylesheets!.length})` : ""}`}
            icon={
              isChallengePage
                ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
                : hasStylesheets
                  ? { source: Icon.Check, tintColor: Color.Green }
                  : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          {hasStylesheets &&
            resources!.stylesheets!.slice(0, 5).map((sheet, index) => {
              const isDataUrl = sheet.href.startsWith("data:");
              const filename = isDataUrl ? "(inline)" : sheet.href.split("/").pop() || sheet.href;
              const absoluteUrl = resolveUrl(sheet.href, data.url);
              return isDataUrl ? (
                <List.Item.Detail.Metadata.Label key={index} title={sheet.media || "all"} text={filename} />
              ) : (
                <List.Item.Detail.Metadata.Link
                  key={index}
                  title={sheet.media || "all"}
                  target={absoluteUrl}
                  text={filename}
                />
              );
            })}
          {hasStylesheets && resources!.stylesheets!.length > 5 && (
            <List.Item.Detail.Metadata.Label title="" text={`...and ${resources!.stylesheets!.length - 5} more`} />
          )}
          {!hasStylesheets && (
            <List.Item.Detail.Metadata.Label title="" text={isChallengePage ? deniedMessage : "No stylesheets found"} />
          )}

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={`Scripts${hasScripts ? ` (${resources!.scripts!.length})` : ""}`}
            icon={
              isChallengePage
                ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
                : hasScripts
                  ? { source: Icon.Check, tintColor: Color.Green }
                  : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          {hasScripts &&
            (() => {
              const externalScripts = resources!.scripts!.filter((s) => !s.src.startsWith("data:"));
              const inlineCount = resources!.scripts!.length - externalScripts.length;
              return (
                <>
                  {externalScripts.slice(0, 5).map((script, index) => {
                    const attrs = [];
                    if (script.async) attrs.push("async");
                    if (script.defer) attrs.push("defer");
                    const filename = script.src.split("/").pop() || script.src;
                    const absoluteUrl = resolveUrl(script.src, data.url);
                    return (
                      <List.Item.Detail.Metadata.Link
                        key={index}
                        title={attrs.length > 0 ? attrs.join(", ") : "sync"}
                        target={absoluteUrl}
                        text={filename}
                      />
                    );
                  })}
                  {externalScripts.length > 5 && (
                    <List.Item.Detail.Metadata.Label title="" text={`...and ${externalScripts.length - 5} more`} />
                  )}
                  {inlineCount > 0 && (
                    <List.Item.Detail.Metadata.Label
                      title=""
                      text={`+ ${inlineCount} inline script${inlineCount > 1 ? "s" : ""}`}
                    />
                  )}
                </>
              );
            })()}
          {!hasScripts && (
            <List.Item.Detail.Metadata.Label title="" text={isChallengePage ? deniedMessage : "No scripts found"} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
