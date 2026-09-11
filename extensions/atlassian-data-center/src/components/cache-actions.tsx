import {
  Action,
  ActionPanel,
  Cache,
  environment,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  popToRoot,
} from "@raycast/api";
import { DEBUG_ENABLE, COMMAND_NAME, CACHE_KEY, AVATAR_TYPE, CACHE_DIR, AVATAR_TYPE_CACHE_KEY_MAP } from "@/constants";
import { removeDirectories } from "@/utils";

const SUPPORT_PATH = environment.supportPath;
const cache = new Cache();

export default function CacheActions() {
  const commandName = environment.commandName || "";

  function onSuccess() {
    showToast(Toast.Style.Success, "Cache Cleared");
    popToRoot({ clearSearchBar: false });
  }

  const clearAllCache = async () => {
    const confirmed = await confirmAlert({
      title: "Clear All Cache",
      message:
        "This will clear all caches for Atlassian Data Center, including avatar cache and user settings. This action cannot be undone.",
      icon: Icon.Warning,
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    cache.clear();
    await removeDirectories(Object.values(CACHE_DIR));
    onSuccess();
  };

  let commandActions = null;
  switch (commandName) {
    case COMMAND_NAME.CONFLUENCE_SEARCH_CONTENT:
      commandActions = <ConfluenceSearchContentCacheActions onCleared={onSuccess} />;
      break;
    case COMMAND_NAME.CONFLUENCE_SEARCH_USER:
      commandActions = <ConfluenceSearchUserCacheActions onCleared={onSuccess} />;
      break;
    case COMMAND_NAME.CONFLUENCE_SEARCH_SPACE:
      commandActions = <ConfluenceSearchSpaceCacheActions onCleared={onSuccess} />;
      break;
    case COMMAND_NAME.JIRA_SEARCH_ISSUE:
      commandActions = <JiraSearchIssueCacheActions onCleared={onSuccess} />;
      break;
    case COMMAND_NAME.JIRA_MANAGE_FIELD:
      commandActions = <JiraManageFieldCacheActions onCleared={onSuccess} />;
      break;
    case COMMAND_NAME.JIRA_WORKLOG_VIEW:
      commandActions = <JiraWorklogViewCacheActions onCleared={onSuccess} />;
      break;
    case COMMAND_NAME.JIRA_BOARD_VIEW:
      commandActions = <JiraBoardViewCacheActions onCleared={onSuccess} />;
      break;
    case COMMAND_NAME.JIRA_NOTIFICATION_VIEW:
      commandActions = <JiraNotificationViewCacheActions onCleared={onSuccess} />;
      break;
    default:
      return null;
  }

  return (
    <ActionPanel.Section title="Cache">
      {DEBUG_ENABLE && <Action.Open title="Open Cache Directory" target={SUPPORT_PATH} />}
      {commandActions}
      <Action
        title="Clear Extension Cache"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={clearAllCache}
      />
    </ActionPanel.Section>
  );
}

interface CacheActionsProps {
  onCleared?: () => void;
}

function ConfluenceSearchContentCacheActions({ onCleared }: CacheActionsProps) {
  const clearCache = async () => {
    console.log("has", cache.has(CACHE_KEY.CONFLUENCE_CURRENT_USER), CACHE_KEY.CONFLUENCE_CURRENT_USER);
    cache.remove(CACHE_KEY.CONFLUENCE_CURRENT_USER);
    cache.remove(AVATAR_TYPE_CACHE_KEY_MAP[AVATAR_TYPE.CONFLUENCE_USER]);
    await removeDirectories([CACHE_DIR[AVATAR_TYPE.CONFLUENCE_USER]]);
    onCleared?.();
  };

  return <Action title="Clear Command Cache" icon={Icon.Trash} onAction={clearCache} />;
}

function ConfluenceSearchUserCacheActions({ onCleared }: CacheActionsProps) {
  const clearCache = async () => {
    cache.remove(CACHE_KEY.CONFLUENCE_CURRENT_USER);
    cache.remove(AVATAR_TYPE_CACHE_KEY_MAP[AVATAR_TYPE.CONFLUENCE_USER]);
    await removeDirectories([CACHE_DIR[AVATAR_TYPE.CONFLUENCE_USER]]);
    onCleared?.();
  };

  return <Action title="Clear Command Cache" icon={Icon.Trash} onAction={clearCache} />;
}

function ConfluenceSearchSpaceCacheActions({ onCleared }: CacheActionsProps) {
  const clearCache = async () => {
    cache.remove(CACHE_KEY.CONFLUENCE_CURRENT_USER);
    cache.remove(AVATAR_TYPE_CACHE_KEY_MAP[AVATAR_TYPE.CONFLUENCE_SPACE]);
    await removeDirectories([CACHE_DIR[AVATAR_TYPE.CONFLUENCE_SPACE]]);
    onCleared?.();
  };

  return <Action title="Clear Command Cache" icon={Icon.Trash} onAction={clearCache} />;
}

function JiraSearchIssueCacheActions({ onCleared }: CacheActionsProps) {
  const clearCache = async () => {
    cache.remove(CACHE_KEY.JIRA_NOTIFICATION_AVAILABLE);
    cache.remove(CACHE_KEY.JIRA_CURRENT_USER);
    onCleared?.();
  };

  return <Action title="Clear Command Cache" icon={Icon.Trash} onAction={clearCache} />;
}

function JiraManageFieldCacheActions({ onCleared }: CacheActionsProps) {
  const clearCache = async () => {
    cache.remove(CACHE_KEY.JIRA_CURRENT_USER);
    cache.remove(CACHE_KEY.JIRA_SELECTED_FIELDS);
    onCleared?.();
  };

  return <Action title="Clear Command Cache" icon={Icon.Trash} onAction={clearCache} />;
}

function JiraWorklogViewCacheActions({ onCleared }: CacheActionsProps) {
  const clearCache = async () => {
    cache.remove(CACHE_KEY.JIRA_CURRENT_USER);
    cache.remove(CACHE_KEY.JIRA_CURRENT_USER);
    onCleared?.();
  };

  return <Action title="Clear Command Cache" icon={Icon.Trash} onAction={clearCache} />;
}

function JiraBoardViewCacheActions({ onCleared }: CacheActionsProps) {
  const clearCache = async () => {
    cache.remove(CACHE_KEY.JIRA_CURRENT_USER);
    cache.remove(CACHE_KEY.JIRA_SELECTED_BOARD_ID);
    cache.remove(CACHE_KEY.JIRA_SELECTED_BOARD_TYPE);
    onCleared?.();
  };

  return <Action title="Clear Command Cache" icon={Icon.Trash} onAction={clearCache} />;
}

function JiraNotificationViewCacheActions({ onCleared }: CacheActionsProps) {
  const clearCache = async () => {
    cache.remove(CACHE_KEY.JIRA_CURRENT_USER);
    cache.remove(CACHE_KEY.JIRA_NOTIFICATION_AVAILABLE);
    onCleared?.();
  };

  return <Action title="Clear Command Cache" icon={Icon.Trash} onAction={clearCache} />;
}
