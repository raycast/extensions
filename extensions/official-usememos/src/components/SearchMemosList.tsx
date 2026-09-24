import {
  Action,
  ActionPanel,
  Icon,
  LaunchType,
  List,
  launchCommand,
  openExtensionPreferences,
  Keyboard,
} from "@raycast/api";
import type { Memo } from "../api/memo";
import type { MemoScope } from "../hooks/useMemos";
import { MemoListItem } from "./MemoListItem";

type Props = {
  memos: Memo[];
  isLoading: boolean;
  errorMessage?: string;
  searchText: string;
  instanceUrl: string;
  currentUserName?: string;
  pagination?: React.ComponentProps<typeof List>["pagination"];
  onSearchTextChange: (text: string) => void;
  onScopeChange: (scope: MemoScope) => void;
  onReload: () => void;
};

export const SearchMemosList = ({
  memos,
  isLoading,
  errorMessage,
  searchText,
  instanceUrl,
  currentUserName,
  pagination,
  onSearchTextChange,
  onScopeChange,
  onReload,
}: Props) => (
  <List
    isLoading={isLoading}
    isShowingDetail
    filtering={false}
    throttle
    pagination={pagination}
    searchBarPlaceholder="Search memo content"
    onSearchTextChange={onSearchTextChange}
    searchBarAccessory={
      <List.Dropdown tooltip="Scope" storeValue onChange={(value) => onScopeChange(value as MemoScope)}>
        <List.Dropdown.Item title="My Memos" value="mine" icon={Icon.Person} />
        <List.Dropdown.Item title="All Visible Memos" value="all" icon={Icon.TwoPeople} />
      </List.Dropdown>
    }
  >
    {errorMessage != null ? (
      <List.EmptyView
        icon={Icon.XMarkCircle}
        title="Couldn't load memos"
        description={errorMessage}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onReload}
            />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    ) : memos.length === 0 && !isLoading ? (
      <List.EmptyView
        icon={Icon.Document}
        title={searchText.trim() === "" ? "No memos yet" : "No memos match"}
        description={searchText.trim() === "" ? "Create your first memo from Raycast." : undefined}
        actions={
          <ActionPanel>
            <Action
              title="Create Memo"
              icon={Icon.Plus}
              onAction={() => launchCommand({ name: "create-memo", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    ) : (
      memos.map((memo) => (
        <MemoListItem
          key={memo.name}
          memo={memo}
          instanceUrl={instanceUrl}
          isEditable={currentUserName != null && memo.creator === currentUserName}
          onReload={onReload}
        />
      ))
    )}
  </List>
);
