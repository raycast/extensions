import React from "react";

export const LaunchType = {
  UserInitiated: "userInitiated",
  Background: "background",
} as const;

export type LaunchType = (typeof LaunchType)[keyof typeof LaunchType];

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

export const Icon = {
  Document: "document",
  Eye: "eye",
  Download: "download",
  XMarkCircle: "xmarkcircle",
  ArrowUp: "arrowup",
  ArrowLeft: "arrowleft",
  ArrowRight: "arrowright",
};

export const showToast = jest.fn().mockResolvedValue({ hide: jest.fn() });

export const Action = {
  OpenInBrowser: ({ url, title }: { url: string; title?: string }) => (
    <div data-testid="action-open-browser" data-url={url}>
      {title}
    </div>
  ),
  CopyToClipboard: ({ content, title }: { content: string; title?: string }) => (
    <div data-testid="action-copy" data-content={content}>
      {title}
    </div>
  ),
  Push: ({ title, target }: { title: string; icon?: string; target: React.ReactNode }) => (
    <div data-testid="action-push" data-title={title}>
      {target}
    </div>
  ),
};

export const ActionPanel = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="action-panel">{children}</div>
);

export const Detail = Object.assign(
  ({ markdown, actions, metadata }: { markdown: string; actions?: React.ReactNode; metadata?: React.ReactNode }) => (
    <div data-testid="detail">
      <div data-testid="detail-markdown">{markdown}</div>
      {actions}
      {metadata}
    </div>
  ),
  {
    Metadata: Object.assign(
      ({ children }: { children: React.ReactNode }) => <div data-testid="detail-metadata">{children}</div>,
      {
        Link: ({ title, target, text }: { title: string; target: string; text: string }) => (
          <div data-testid="metadata-link" data-title={title} data-target={target}>
            {text}
          </div>
        ),
      },
    ),
  },
);

export const List = Object.assign(
  ({
    isLoading,
    searchBarPlaceholder,
    searchBarAccessory,
    children,
  }: {
    isLoading?: boolean;
    searchBarPlaceholder?: string;
    searchBarAccessory?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div data-testid="list" data-loading={isLoading} data-placeholder={searchBarPlaceholder}>
      {searchBarAccessory}
      {children}
    </div>
  ),
  {
    Item: ({
      title,
      subtitle,
      icon,
      actions,
      id,
    }: {
      key?: string;
      title: string;
      subtitle?: string;
      icon?: string;
      actions?: React.ReactNode;
      id?: string;
    }) => (
      <div data-testid="list-item" data-title={title} data-subtitle={subtitle} data-icon={icon} data-url={id}>
        {actions}
      </div>
    ),
    EmptyView: ({ title, icon }: { title: string; icon?: string }) => (
      <div data-testid="list-empty-view" data-title={title} data-icon={icon} />
    ),
    Dropdown: Object.assign(
      ({
        tooltip,
        value,
        onChange,
        children,
      }: {
        tooltip?: string;
        value?: string;
        onChange?: (value: string) => void;
        children?: React.ReactNode;
      }) => (
        <select
          data-testid="list-dropdown"
          data-tooltip={tooltip}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        >
          {children}
        </select>
      ),
      {
        Item: ({ title, value }: { title: string; value: string }) => <option value={value}>{title}</option>,
      },
    ),
  },
);

const mockCacheData: Record<string, string> = {};

export class Cache {
  get(key: string): string | undefined {
    return mockCacheData[key];
  }

  set(key: string, value: string): void {
    mockCacheData[key] = value;
  }

  remove(key: string): void {
    delete mockCacheData[key];
  }

  clear(): void {
    Object.keys(mockCacheData).forEach((key) => delete mockCacheData[key]);
  }
}

export const clearMockCache = () => {
  Object.keys(mockCacheData).forEach((key) => delete mockCacheData[key]);
};
