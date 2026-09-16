import { Icon, List } from "@raycast/api";
import type { ProviderDefinition } from "../providers/types";
import { escapeMarkdown } from "../utils/markdown";
import { ProviderSourceActions } from "./provider-actions";

/** Keep empty and incomplete data explanations in the same detail pane as status data. */
export function ProviderNotice({
  id,
  title,
  description,
  provider,
  onRefresh,
  icon = Icon.Info,
}: {
  id: string;
  title: string;
  description: string;
  provider: ProviderDefinition;
  onRefresh(): Promise<void>;
  icon?: Icon;
}) {
  return (
    <List.Item
      id={id}
      icon={icon}
      title={title}
      detail={<List.Item.Detail markdown={`### ${escapeMarkdown(title)}\n\n${escapeMarkdown(description)}`} />}
      actions={<ProviderSourceActions provider={provider} onRefresh={onRefresh} />}
    />
  );
}
