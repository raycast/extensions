import * as React from 'react';

declare module '@raycast/api' {
  // Fix the React JSX integration issues
  export class List extends React.Component<any> {
    static Item: React.FC<any>;
  }
  
  export class ActionPanel extends React.Component<any> {}
  export class Action extends React.Component<any> {}
  
  // Ensure the Toast namespace exists 
  export namespace Toast {
    interface ActionOptions {
      title: string;
      onAction?: () => void;
      shortcut?: Keyboard.Shortcut;
    }
  }
  
  export interface Keyboard {
    Shortcut: any;
  }
}

// Extend the @raycast/utils module
declare module '@raycast/utils' {
  export function showFailureToast(
    error: unknown,
    options?: {
      title?: string;
      primaryAction?: Toast.ActionOptions;
    }
  ): Promise<any>;
} 