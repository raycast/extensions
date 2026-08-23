// fallow-ignore-next-line unresolved-import
import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getWorkspaceContext } from "./api/client";
import { FIGA_DEVELOPER_API_DOCS_URL } from "./api/links";
import type { FigaPaginationMeta, FigaReferenceItem, FigaWorkspaceContext } from "./api/types";
import { ReadCapabilityGate } from "./read-capability-gate";
import { canReadResource, type ReadCapabilityResource } from "./format";

type ReferenceResource = Extract<ReadCapabilityResource, "categories" | "recipients">;

interface ReferenceListResponse {
  pagination: FigaPaginationMeta;
}

export interface ReferenceCommandConfig<TItem extends FigaReferenceItem, TResponse extends ReferenceListResponse> {
  resource: ReferenceResource;
  title: string;
  itemName: string;
  pluralName: string;
  icon: Icon;
  fetch: () => Promise<TResponse>;
  getItems: (response: TResponse) => TItem[];
  getListUrl: (workspaceId: string) => string;
  getItemUrl: (workspaceId: string, item: TItem) => string;
  getItemIcon?: (item: TItem) => List.Item.Props["icon"];
}

interface ReferenceCommandData<TResponse extends ReferenceListResponse> {
  context: FigaWorkspaceContext;
  response?: TResponse;
}

export function ReferenceListCommand<TItem extends FigaReferenceItem, TResponse extends ReferenceListResponse>({
  config,
}: {
  config: ReferenceCommandConfig<TItem, TResponse>;
}) {
  const state = usePromise(() => loadReferenceCommandData(config));

  return <ReferenceCommandView config={config} {...state} />;
}

async function loadReferenceCommandData<TItem extends FigaReferenceItem, TResponse extends ReferenceListResponse>(
  config: ReferenceCommandConfig<TItem, TResponse>,
): Promise<ReferenceCommandData<TResponse>> {
  const context = await getWorkspaceContext();
  if (!canReadResource(context, config.resource)) return { context };

  const response = await config.fetch();
  return { context, response };
}

function ReferenceCommandView<TItem extends FigaReferenceItem, TResponse extends ReferenceListResponse>({
  config,
  data,
  error,
  isLoading,
  revalidate,
}: {
  config: ReferenceCommandConfig<TItem, TResponse>;
  data?: ReferenceCommandData<TResponse>;
  error?: unknown;
  isLoading: boolean;
  revalidate: () => void;
}) {
  return (
    <ReadCapabilityGate context={data?.context} error={error} onRetry={revalidate} resource={config.resource}>
      <List
        isLoading={isLoading}
        navigationTitle={config.title}
        searchBarPlaceholder={`Search ${config.pluralName.toLowerCase()}`}
      >
        <List.EmptyView
          icon={config.icon}
          title={getEmptyTitle(config, isLoading)}
          description={`No ${config.pluralName.toLowerCase()} were returned for this workspace.`}
          actions={<ReferenceListActions config={config} data={data} onRefresh={revalidate} />}
        />
        <ReferenceSection config={config} data={data} onRefresh={revalidate} />
      </List>
    </ReadCapabilityGate>
  );
}

function ReferenceSection<TItem extends FigaReferenceItem, TResponse extends ReferenceListResponse>({
  config,
  data,
  onRefresh,
}: {
  config: ReferenceCommandConfig<TItem, TResponse>;
  data?: ReferenceCommandData<TResponse>;
  onRefresh: () => void;
}) {
  if (!data?.response) return null;

  const items = config.getItems(data.response);

  return (
    <List.Section title={`${config.pluralName} · ${data.response.pagination.total} total`}>
      {items.map((item) => (
        <ReferenceListItem key={item.id} config={config} context={data.context} item={item} onRefresh={onRefresh} />
      ))}
    </List.Section>
  );
}

function ReferenceListItem<TItem extends FigaReferenceItem, TResponse extends ReferenceListResponse>({
  config,
  context,
  item,
  onRefresh,
}: {
  config: ReferenceCommandConfig<TItem, TResponse>;
  context: FigaWorkspaceContext;
  item: TItem;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      id={item.id}
      icon={config.getItemIcon?.(item) ?? config.icon}
      title={item.name}
      subtitle={getItemSubtitle(item)}
      keywords={getItemKeywords(item)}
      accessories={[
        { tag: { value: getScopeLabel(item), color: getScopeColor(item) } },
        { text: formatExpenseCount(item.expenseCount), icon: Icon.Receipt },
      ]}
      actions={<ReferenceItemActions config={config} context={context} item={item} onRefresh={onRefresh} />}
    />
  );
}

function ReferenceItemActions<TItem extends FigaReferenceItem, TResponse extends ReferenceListResponse>({
  config,
  context,
  item,
  onRefresh,
}: {
  config: ReferenceCommandConfig<TItem, TResponse>;
  context: FigaWorkspaceContext;
  item: TItem;
  onRefresh: () => void;
}) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title={`Open ${config.itemName} in Figa`}
        icon={Icon.Link}
        url={config.getItemUrl(context.workspace.id, item)}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action.CopyToClipboard
        title={`Copy ${config.itemName} Name`}
        icon={Icon.CopyClipboard}
        content={item.name}
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />
      <Action.Paste title={`Paste ${config.itemName} Name`} icon={Icon.Clipboard} content={item.name} />
      <Action.CopyToClipboard
        title={`Copy ${config.itemName} ID`}
        icon={Icon.Hashtag}
        content={item.id}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.Paste title={`Paste ${config.itemName} ID`} icon={Icon.Hashtag} content={item.id} />
      <Action.OpenInBrowser
        title={`Open ${config.pluralName} in Figa`}
        icon={config.icon}
        url={config.getListUrl(context.workspace.id)}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
    </ActionPanel>
  );
}

function ReferenceListActions<TItem extends FigaReferenceItem, TResponse extends ReferenceListResponse>({
  config,
  data,
  onRefresh,
}: {
  config: ReferenceCommandConfig<TItem, TResponse>;
  data?: ReferenceCommandData<TResponse>;
  onRefresh: () => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      {data ? (
        <Action.OpenInBrowser
          title={`Open ${config.pluralName} in Figa`}
          icon={config.icon}
          url={config.getListUrl(data.context.workspace.id)}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      ) : null}
      <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Open Developer API Docs" icon={Icon.Book} url={FIGA_DEVELOPER_API_DOCS_URL} />
    </ActionPanel>
  );
}

function getItemSubtitle(item: FigaReferenceItem): string {
  return item.description || getScopeLabel(item);
}

function getItemKeywords(item: FigaReferenceItem): string[] {
  return [item.name, item.description, getScopeLabel(item), item.id].filter(isPresentString);
}

function isPresentString(value: string | null | undefined): value is string {
  return Boolean(value);
}

function getScopeLabel(item: FigaReferenceItem): string {
  return item.isGlobal ? "Global" : "Workspace";
}

function getScopeColor(item: FigaReferenceItem): Color {
  return item.isGlobal ? Color.Blue : Color.Green;
}

function formatExpenseCount(value: number | undefined): string {
  return `${value ?? 0} expenses`;
}

function getEmptyTitle<TItem extends FigaReferenceItem, TResponse extends ReferenceListResponse>(
  config: ReferenceCommandConfig<TItem, TResponse>,
  isLoading: boolean,
): string {
  return isLoading ? `Loading ${config.pluralName.toLowerCase()}` : `No ${config.pluralName} found`;
}
