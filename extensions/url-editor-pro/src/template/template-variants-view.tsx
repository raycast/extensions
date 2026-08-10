import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { TemplateResult } from "./template-executor";
import { EditUrlForm } from "../editor/edit-url-form";
import { ParseResult } from "../types";

interface TemplateVariantsViewProps {
  results: TemplateResult[];
  originalUrl: string;
  onSave?: (parsed: ParseResult) => void;
}

export function TemplateVariantsView({ results, originalUrl, onSave }: TemplateVariantsViewProps) {
  // Flatten all URLs from all template results
  const allUrls = results.flatMap((result) =>
    result.urls.map((url) => ({
      url,
      sourceTemplate: result.sourceTemplate,
      groupName: result.groupName,
      expansionInfo: result.expansionInfo,
    })),
  );

  // Deduplicate URLs
  const uniqueUrls = Array.from(new Map(allUrls.map((item) => [item.url, item])).values());

  return (
    <List searchBarPlaceholder="Search generated URLs..." navigationTitle="URL Variants">
      {uniqueUrls.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No variants generated"
          description="No URL variants were generated from the templates"
        />
      ) : (
        uniqueUrls.map((item, index) => (
          <List.Item
            key={`${item.url}-${index}`}
            id={`variant-${index}`}
            title={item.url}
            subtitle={
              item.expansionInfo
                ? `${item.groupName} · path hierarchy (${item.expansionInfo.levels} levels)`
                : `${item.groupName} · ${item.sourceTemplate}`
            }
            icon={Icon.Link}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item.url} title="Copy URL" />
                {onSave && (
                  <Action.Push
                    title="Edit This URL"
                    icon={Icon.Pencil}
                    target={<EditUrlForm url={{ href: item.url }} onSave={onSave} />}
                  />
                )}
                <Action.CopyToClipboard
                  content={originalUrl}
                  title="Copy Original URL"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
