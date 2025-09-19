declare module "@raycast/api" {
  import { FC } from "react";

  export interface ListProps {
    children?: React.ReactNode;
    isLoading?: boolean;
    searchText?: string;
    onSearchTextChange?: (text: string) => void;
    navigationTitle?: string;
    searchBarPlaceholder?: string;
    searchBarAccessory?: React.ReactNode;
  }

  export interface ListItemProps {
    title: string;
    subtitle?: string;
    icon?: unknown;
    quickLook?: { path: string };
    accessories?: Array<{ text: string; tooltip?: string }>;
    actions?: React.ReactNode;
  }

  export interface ActionPanelProps {
    children?: React.ReactNode;
  }

  export interface ActionProps {
    title: string;
    onAction?: () => void;
    icon?: unknown;
    shortcut?: { modifiers: string[]; key: string };
  }

  export const List: FC<ListProps> & {
    Item: FC<ListItemProps>;
    EmptyView: FC<{
      title: string;
      description: string;
      actions?: React.ReactNode;
    }>;
    Dropdown: FC<{
      tooltip: string;
      value: string;
      onChange: (value: string) => void;
      storeValue?: boolean;
      children: React.ReactNode;
    }> & {
      Section: FC<{ title: string; children: React.ReactNode }>;
      Item: FC<{ title: string; value: string; icon?: unknown }>;
    };
  };

  export const ActionPanel: FC<ActionPanelProps> & {
    Section: FC<{ title?: string; children: React.ReactNode }>;
  };

  export const Action: FC<ActionProps> & {
    Open: FC<{
      title: string;
      target: string;
      application?: string;
      icon?: unknown;
      shortcut?: { modifiers: string[]; key: string };
    }>;
    ShowInFinder: FC<{
      title: string;
      path: string;
      shortcut?: { modifiers: string[]; key: string };
    }>;
    CopyToClipboard: FC<{
      title: string;
      content: string;
      shortcut?: { modifiers: string[]; key: string };
      onCopy?: () => void;
    }>;
    OpenWith: FC<{
      title: string;
      path: string;
      shortcut?: { modifiers: string[]; key: string };
    }>;
    ToggleQuickLook: FC<{
      title: string;
      shortcut?: { modifiers: string[]; key: string };
    }>;
    Trash: FC<{ title: string; paths: string[] }>;
    OpenInBrowser: FC<{
      title: string;
      url: string;
      shortcut?: { modifiers: string[]; key: string };
    }>;
  };

  export const Icon: Record<string, unknown>;
  export const Toast: {
    Style: {
      Success: unknown;
      Failure: unknown;
    };
  };
  export function showToast(options: {
    style: unknown;
    title: string;
    message?: string;
  }): void;
  export function showHUD(message: string): void;
  export function getPreferenceValues<T>(): T;
}
