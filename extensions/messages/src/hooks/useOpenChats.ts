import { useChatCache } from "./useChatCache";

export function useOpenChats(searchText = "") {
  const cache = useChatCache("open-chat", searchText);
  return {
    data: cache.visibleChats,
    isLoading: cache.isLoadingChats,
    permissionView: cache.permissionView,
    hardReload: cache.hardReload,
  };
}
