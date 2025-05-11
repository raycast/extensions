import { ReactNode } from "react";

declare module "@raycast/api" {
  // Fix for List.Item
  namespace List {
    interface Item {
      key?: string;
      title: string;
      actions: ReactNode;
    }
  }

  // Fix for ActionPanel and Action
  interface ActionPanel {
    children: ReactNode;
  }

  interface Action {
    title: string;
    onAction: () => void;
  }
}
