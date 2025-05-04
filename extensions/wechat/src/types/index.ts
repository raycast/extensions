export interface SearchResult {
  icon: { path: string };
  title: string;
  subtitle: string;
  arg: string;
  valid: number;
  url: string;
}

export interface SearchState {
  items: SearchResult[];
  recentContacts: SearchResult[];
  isLoading: boolean;
  searchText: string;
}

export interface SearchListItemProps {
  searchResult: SearchResult;
  isPinned: boolean;
  onTogglePin: () => void;
  onClearHistory: () => void;
  onGenerateAiMessage: () => Promise<void>;
}

export interface StateType {
  isLoading: boolean;
  isWeChatInstalled: boolean;
  isWeChatRunning: boolean;
  isWeChatTweakInstalled: boolean;
  isHomebrewInstalled: boolean;
  isWeChatServiceRunning: boolean;
  error: string | null;
}

export interface GenerateMessageFormProps {
  contactName: string;
  contactId: string;
}
