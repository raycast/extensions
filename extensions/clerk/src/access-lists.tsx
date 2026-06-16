import { Action, ActionPanel, Alert, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { AllowlistIdentifier, BlocklistIdentifier } from "@clerk/backend";
import { PAGE_SIZE } from "./lib/hooks";
import { useSelectedApp } from "./lib/use-selected-app";
import { AuthGuard } from "./components/auth-guard";
import { AppDropdown } from "./components/app-dropdown";
import { AccessIdentifierForm, type ListType } from "./components/access-identifier-form";
import { clientFor } from "./lib/clerk";
import { getPageParams, computeHasMore } from "./lib/pagination";
import { showClerkError } from "./lib/errors";
import type { ClerkApp } from "./types";

type Identifier = AllowlistIdentifier | BlocklistIdentifier;

function IdentifierList({ app, accessory }: { app: ClerkApp; accessory?: List.Props["searchBarAccessory"] }) {
  const [listType, setListType] = useState<ListType>("allowlist");
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (appId: string, type: ListType) => async (options: { page: number }) => {
      const { limit, offset } = getPageParams(options.page, PAGE_SIZE);
      const res =
        type === "allowlist"
          ? await clientFor(app).allowlistIdentifiers.getAllowlistIdentifierList({ limit, offset })
          : await clientFor(app).blocklistIdentifiers.getBlocklistIdentifierList({ limit, offset });
      return { data: res.data, hasMore: computeHasMore(offset, res.data.length, res.totalCount) };
    },
    [app.id, listType],
    { onError: showClerkError },
  );

  const otherType: ListType = listType === "allowlist" ? "blocklist" : "allowlist";

  async function remove(item: Identifier) {
    const ok = await confirmAlert({
      title: `Remove ${item.identifier}?`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Removing identifier" });
    try {
      await mutate(
        listType === "allowlist"
          ? clientFor(app).allowlistIdentifiers.deleteAllowlistIdentifier(item.id)
          : clientFor(app).blocklistIdentifiers.deleteBlocklistIdentifier(item.id),
      );
      toast.style = Toast.Style.Success;
      toast.title = "Identifier removed";
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  const switchListAction = (
    <Action
      title={`Switch to ${otherType === "allowlist" ? "Allowlist" : "Blocklist"}`}
      icon={otherType === "allowlist" ? Icon.CheckCircle : Icon.XMarkCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      onAction={() => setListType(otherType)}
    />
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder={`Filter ${listType}…`}
      searchBarAccessory={accessory}
    >
      <List.EmptyView
        icon={listType === "allowlist" ? Icon.CheckCircle : Icon.XMarkCircle}
        title={`No ${listType} identifiers`}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Identifier"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<AccessIdentifierForm app={app} listType={listType} onAdded={() => mutate()} />}
            />
            {switchListAction}
          </ActionPanel>
        }
      />
      {(data ?? []).map((item) => (
        <List.Item
          key={item.id}
          icon={listType === "allowlist" ? Icon.CheckCircle : Icon.XMarkCircle}
          title={item.identifier}
          accessories={[{ tag: item.identifierType }, { date: new Date(item.createdAt), tooltip: "Created" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Identifier"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<AccessIdentifierForm app={app} listType={listType} onAdded={() => mutate()} />}
              />
              <Action
                title="Remove Identifier"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => remove(item)}
              />
              {switchListAction}
              <Action.CopyToClipboard title="Copy Identifier" content={item.identifier} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function AccessLists() {
  const { apps, app, isLoading, revalidate, activeKey, onAppChange } = useSelectedApp();

  if (isLoading) return <List isLoading />;
  if (!app) return <AuthGuard onChanged={revalidate} />;

  return (
    <IdentifierList
      app={app}
      accessory={<AppDropdown key={activeKey} apps={apps} defaultId={app.id} onChange={onAppChange} />}
    />
  );
}
