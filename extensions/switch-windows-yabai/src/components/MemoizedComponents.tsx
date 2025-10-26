/**
 * Memoized React components for optimal rendering performance
 * Prevents unnecessary re-renders and improves UI responsiveness
 */

import React, { memo } from "react";
import { List, Action, ActionPanel } from "@raycast/api";
import { Application, YabaiWindow, SortMethod } from "../models";
import { shallowEqual } from "../utils/reactOptimizations";

interface WindowItemProps {
  window: YabaiWindow;
  applications: Application[];
  onFocused: (id: number) => void;
  onRemove: (id: number) => void;
  setSortMethod: (method: SortMethod) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  getAppIcon: (window: YabaiWindow, applications: Application[]) => React.ReactElement | string;
  WindowActions: React.ComponentType<unknown>;
}

/**
 * Memoized window item component
 * Only re-renders when window data actually changes
 */
export const MemoizedWindowItem = memo<WindowItemProps>(
  ({
    window,
    applications,
    onFocused,
    onRemove,
    setSortMethod,
    onRefresh,
    isRefreshing,
    getAppIcon,
    WindowActions,
  }) => {
    return (
      <List.Item
        key={window.id}
        id={`window-${window.id}`}
        icon={getAppIcon(window, applications)}
        title={window.app}
        subtitle={window.title}
        accessories={window["has-focus"] || window.focused ? [{ text: "focused" }] : []}
        actions={
          <WindowActions
            windowId={window.id}
            windowApp={window.app}
            isFocused={window["has-focus"] || window.focused}
            onFocused={onFocused}
            onRemove={onRemove}
            setSortMethod={setSortMethod}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />
        }
      />
    );
  },
  // Custom comparison function for better performance
  (prevProps, nextProps) => {
    // Compare window data
    if (prevProps.window.id !== nextProps.window.id) return false;
    if (prevProps.window.app !== nextProps.window.app) return false;
    if (prevProps.window.title !== nextProps.window.title) return false;
    if (prevProps.window["has-focus"] !== nextProps.window["has-focus"]) return false;
    if (prevProps.window.focused !== nextProps.window.focused) return false;

    // Compare other props that might affect rendering
    if (prevProps.isRefreshing !== nextProps.isRefreshing) return false;

    // Applications array comparison (length check is usually sufficient)
    if (prevProps.applications.length !== nextProps.applications.length) return false;

    return true;
  },
);

MemoizedWindowItem.displayName = "MemoizedWindowItem";

interface ApplicationItemProps {
  application: Application;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenApplication: (path: string) => void;
}

/**
 * Memoized application item component
 */
export const MemoizedApplicationItem = memo<ApplicationItemProps>(
  ({ application, onRefresh, isRefreshing, onOpenApplication }) => {
    return (
      <List.Item
        key={application.path}
        icon={{ fileIcon: application.path }}
        title={application.name}
        actions={
          <ActionPanel>
            <Action
              title="Open Application"
              onAction={() => onOpenApplication(application.path)}
              shortcut={{ modifiers: [], key: "enter" }}
            />
            <Action
              title={isRefreshing ? "Refreshing…" : "Refresh Windows & Apps"}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd", "ctrl"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    );
  },
  // Simple equality check for applications
  (prevProps, nextProps) => {
    return (
      prevProps.application.path === nextProps.application.path &&
      prevProps.application.name === nextProps.application.name &&
      prevProps.isRefreshing === nextProps.isRefreshing
    );
  },
);

MemoizedApplicationItem.displayName = "MemoizedApplicationItem";

interface WindowListSectionProps {
  windows: YabaiWindow[];
  applications: Application[];
  onFocused: (id: number) => void;
  onRemove: (id: number) => void;
  setSortMethod: (method: SortMethod) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  getAppIcon: (window: YabaiWindow, applications: Application[]) => React.ReactElement | string;
  WindowActions: React.ComponentType<unknown>;
}

/**
 * Memoized window list section
 * Prevents re-rendering entire list when only one item changes
 */
export const MemoizedWindowListSection = memo<WindowListSectionProps>(
  ({
    windows,
    applications,
    onFocused,
    onRemove,
    setSortMethod,
    onRefresh,
    isRefreshing,
    getAppIcon,
    WindowActions,
  }) => {
    if (windows.length === 0) return null;

    return (
      <List.Section title="Windows" subtitle={windows.length.toString()}>
        {windows.map((window) => (
          <MemoizedWindowItem
            key={`window-${window.id}`}
            window={window}
            applications={applications}
            onFocused={onFocused}
            onRemove={onRemove}
            setSortMethod={setSortMethod}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            getAppIcon={getAppIcon}
            WindowActions={WindowActions}
          />
        ))}
      </List.Section>
    );
  },
  // Deep comparison for windows array
  (prevProps, nextProps) => {
    // Quick checks first
    if (prevProps.windows.length !== nextProps.windows.length) return false;
    if (prevProps.isRefreshing !== nextProps.isRefreshing) return false;
    if (prevProps.applications.length !== nextProps.applications.length) return false;

    // Compare windows array content
    for (let i = 0; i < prevProps.windows.length; i++) {
      const prevWindow = prevProps.windows[i];
      const nextWindow = nextProps.windows[i];

      if (prevWindow.id !== nextWindow.id) return false;
      if (prevWindow.app !== nextWindow.app) return false;
      if (prevWindow.title !== nextWindow.title) return false;
      if (prevWindow["has-focus"] !== nextWindow["has-focus"]) return false;
      if (prevWindow.focused !== nextWindow.focused) return false;
    }

    return true;
  },
);

MemoizedWindowListSection.displayName = "MemoizedWindowListSection";

interface ApplicationListSectionProps {
  applications: Application[];
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenApplication: (path: string) => void;
}

/**
 * Memoized application list section
 */
export const MemoizedApplicationListSection = memo<ApplicationListSectionProps>(
  ({ applications, onRefresh, isRefreshing, onOpenApplication }) => {
    if (applications.length === 0) return null;

    return (
      <List.Section title="Applications" subtitle={applications.length.toString()}>
        {applications.map((app) => (
          <MemoizedApplicationItem
            key={`app-${app.path}`}
            application={app}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            onOpenApplication={onOpenApplication}
          />
        ))}
      </List.Section>
    );
  },
  // Shallow comparison for applications
  (prevProps, nextProps) => {
    if (prevProps.applications.length !== nextProps.applications.length) return false;
    if (prevProps.isRefreshing !== nextProps.isRefreshing) return false;

    // Compare applications array content
    for (let i = 0; i < prevProps.applications.length; i++) {
      if (prevProps.applications[i].path !== nextProps.applications[i].path) return false;
      if (prevProps.applications[i].name !== nextProps.applications[i].name) return false;
    }

    return true;
  },
);

MemoizedApplicationListSection.displayName = "MemoizedApplicationListSection";

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

/**
 * Virtualized list component for handling large datasets
 * Only renders visible items to improve performance
 */
export const VirtualizedList = memo<VirtualizedListProps<unknown>>(
  ({ items, itemHeight, containerHeight, renderItem, overscan = 5 }) => {
    const [scrollTop, setScrollTop] = React.useState(0);

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    const handleScroll = React.useCallback((event: React.UIEvent<HTMLElement>) => {
      setScrollTop(event.currentTarget.scrollTop);
    }, []);

    return (
      <div
        style={{
          height: containerHeight,
          overflowY: "auto",
        }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: offsetY,
              width: "100%",
            }}
          >
            {visibleItems.map((item, index) => renderItem(item, startIndex + index))}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.items.length === nextProps.items.length &&
      prevProps.itemHeight === nextProps.itemHeight &&
      prevProps.containerHeight === nextProps.containerHeight &&
      shallowEqual(prevProps.items, nextProps.items)
    );
  },
);

VirtualizedList.displayName = "VirtualizedList";

export default {
  MemoizedWindowItem,
  MemoizedApplicationItem,
  MemoizedWindowListSection,
  MemoizedApplicationListSection,
  VirtualizedList,
};
