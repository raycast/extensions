import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { searchFiles } from "./api/endpoints";
import { Attachment } from "./api/types";
import { AccountActions, OpenInWebAppAction } from "./components/actions";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { formatDate, parseApiDate } from "./lib/dates";
import { entityWebUrl } from "./lib/links";
import { track } from "./lib/telemetry";

const MIN_QUERY = 2;

function iconForContentType(contentType?: string): Icon {
  const type = (contentType ?? "").toLowerCase();
  if (type.startsWith("image/")) return Icon.Image;
  if (type.includes("pdf")) return Icon.Document;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv")) return Icon.BarChart;
  if (type.includes("zip") || type.includes("compressed")) return Icon.Box;
  return Icon.Document;
}

/** Human-readable label for an attachment's related entity type. */
const ENTITY_LABEL: Record<string, string> = {
  expirationitem: "Expiration Item",
  contact: "Contact",
  location: "Location",
  vehicle: "Vehicle",
  equipment: "Equipment",
  company: "Company",
};

function entityLabel(entityType?: string): string | undefined {
  if (!entityType) return undefined;
  return ENTITY_LABEL[entityType.toLowerCase()] ?? entityType;
}

function formatBytes(bytes?: number): string | undefined {
  if (!bytes || bytes <= 0) return undefined;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

export default function SearchFilesCommand() {
  const [searchText, setSearchText] = useState("");
  const query = useDebouncedValue(searchText.trim(), 300);
  const abortable = useRef<AbortController | undefined>(undefined);

  useEffect(() => track({ name: "command_opened", command_name: "search-files" }), []);

  const { isLoading, data } = usePromise(
    async (q: string) => {
      const startedAt = Date.now();
      // includeFileContent=false is enforced in the endpoint — never pull blobs.
      const res = await searchFiles({ term: q, page: 1, signal: abortable.current?.signal });
      track({
        name: "search_executed",
        command_name: "search-files",
        query_length: q.length,
        result_count: res.attachments.length,
        latency_ms: Date.now() - startedAt,
      });
      return res.attachments;
    },
    [query],
    { execute: query.length >= MIN_QUERY, abortable },
  );

  const files = data ?? [];
  const showHint = query.length > 0 && query.length < MIN_QUERY;

  return (
    <List
      isLoading={isLoading}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search files across all your records…"
    >
      {showHint ? (
        <List.EmptyView
          icon="icon.png"
          title="Keep typing…"
          description={`Enter at least ${MIN_QUERY} characters to search.`}
        />
      ) : !isLoading && query.length >= MIN_QUERY && files.length === 0 ? (
        <List.EmptyView icon="icon.png" title="No files found" description={`No files match “${query}”.`} />
      ) : (
        files.map((file) => <FileListItem key={file.id} file={file} />)
      )}
    </List>
  );
}

function FileListItem({ file }: { file: Attachment }) {
  const created = parseApiDate(file.created);
  const relatedUrl = entityWebUrl(file.entity_type, file.entity_id);
  const label = entityLabel(file.entity_type);

  const accessories: List.Item.Accessory[] = [];
  if (label) accessories.push({ tag: label });
  const size = formatBytes(file.content_legth);
  if (size) accessories.push({ text: size });
  if (created) accessories.push({ date: created, tooltip: `Created ${formatDate(created)}` });

  return (
    <List.Item
      icon={iconForContentType(file.content_type)}
      title={file.name}
      subtitle={file.content_type}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {relatedUrl ? (
              <OpenInWebAppAction
                url={relatedUrl}
                entityType={file.entity_type ?? "attachment"}
                title={label ? `Open ${label} in Web App` : "Open Related Item in Web App"}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy File Name"
              content={file.name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
          <AccountActions />
        </ActionPanel>
      }
    />
  );
}
