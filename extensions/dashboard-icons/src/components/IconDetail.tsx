import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { preferences } from "../lib/actions";
import { fetchImageSize } from "../lib/files";
import {
  aboutIcon,
  authorUrl,
  displayTitle,
  formatDate,
  FORMAT_LABELS,
  groupIconFiles,
  SOURCE_LABELS,
} from "../lib/icons";
import { dashboardIcons } from "../lib/mcp";
import { IconDetails, IconFile, Source, VariantGroup } from "../lib/types";
import { FileActions } from "./FileActions";
import { previewMarkdown } from "./preview";

function AuthorRow({ icon }: { icon: IconDetails }) {
  const url = authorUrl(icon);
  const author = icon.author ?? "";
  return url ? (
    <List.Item.Detail.Metadata.Link title="Author" text={author} target={url} />
  ) : (
    <List.Item.Detail.Metadata.Label title="Author" text={author} />
  );
}

function FileDetail({ icon, group, file }: { icon: IconDetails; group: VariantGroup; file: IconFile }) {
  const { data: size, isLoading } = useCachedPromise(fetchImageSize, [file.url], {
    // Without a size the preview falls back to a square, so errors need no toast.
    onError: () => undefined,
  });
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={
        isLoading
          ? ""
          : [
              previewMarkdown(file, `${icon.title} ${group.label} ${FORMAT_LABELS[file.format]}`, size),
              "#### About This Icon",
              ...aboutIcon(icon),
            ].join("\n\n")
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Variant"
            text={group.hint ? `${group.label} – ${group.hint}` : group.label}
          />
          <List.Item.Detail.Metadata.Label title="Format" text={FORMAT_LABELS[file.format]} />
          <List.Item.Detail.Metadata.Label title="File Name" text={file.fileName} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Icon" text={displayTitle(icon)} />
          <List.Item.Detail.Metadata.Label title="Source" text={SOURCE_LABELS[icon.source]} />
          {icon.categories.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Categories">
              {icon.categories.map((category) => (
                <List.Item.Detail.Metadata.TagList.Item key={category} text={category} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {icon.aliases.length > 0 && (
            <List.Item.Detail.Metadata.Label title="Aliases" text={icon.aliases.join(", ")} />
          )}
          {icon.author && <AuthorRow icon={icon} />}
          {formatDate(icon.updatedAt) && (
            <List.Item.Detail.Metadata.Label title="Updated" text={formatDate(icon.updatedAt)} />
          )}
          {icon.license && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="License" text={icon.license.name} />
              {icon.license.attribution && (
                <List.Item.Detail.Metadata.Label title="Attribution" text={icon.license.attribution} />
              )}
              {icon.license.providerUrl && (
                <List.Item.Detail.Metadata.Link
                  title="Provider"
                  text={icon.license.provider || icon.license.providerUrl}
                  target={icon.license.providerUrl}
                />
              )}
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link title="Icon Page" text="dashboardicons.com" target={icon.pageUrl} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function IconDetail({ name, source, title }: { name: string; source: Source; title: string }) {
  const { defaultFormat } = preferences();
  const abortable = useRef<AbortController>(null);
  const { data, isLoading } = useCachedPromise(
    (iconName: string, iconSource: Source) => dashboardIcons.getIcon(iconName, iconSource, abortable.current?.signal),
    [name, source],
    { abortable, failureToastOptions: { title: "Could not load icon" } },
  );

  const icon = data?.found ? data.icon : undefined;
  const groups = icon ? groupIconFiles(icon, defaultFormat) : [];

  return (
    <List
      navigationTitle={title}
      isLoading={isLoading}
      isShowingDetail={groups.length > 0}
      searchBarPlaceholder="Filter formats and variants"
    >
      {!isLoading && data && groups.length === 0 && (
        <List.EmptyView
          icon={Icon.QuestionMarkCircle}
          title="No Files Found"
          description={
            !data.found && data.didYouMean.length > 0
              ? `Did you mean: ${data.didYouMean.map((result) => result.title).join(", ")}?`
              : "This icon has no downloadable files."
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Search on Website"
                url={`https://dashboardicons.com/icons?q=${encodeURIComponent(name)}`}
              />
            </ActionPanel>
          }
        />
      )}
      {icon &&
        groups.map((group) => (
          <List.Section key={group.variant} title={group.label} subtitle={group.hint}>
            {group.files.map((file) => (
              <List.Item
                key={`${group.variant}-${file.format}`}
                title={FORMAT_LABELS[file.format]}
                icon={{ source: file.url }}
                keywords={[group.label, group.variant, file.format, file.fileName]}
                detail={<FileDetail icon={icon} group={group} file={file} />}
                actions={<FileActions file={file} pageUrl={icon.pageUrl} />}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
