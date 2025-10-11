/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@raycast/api" {
  import * as React from "react";

  export * from "@raycast/api/types/index";

  // Override problematic component types
  export const List: React.FC<any> & {
    Item: React.FC<any>;
    Section: React.FC<any>;
    Dropdown: React.FC<any> & {
      Item: React.FC<any>;
    };
    EmptyView: React.FC<any>;
  };

  export const ActionPanel: React.FC<any> & {
    Section: React.FC<any>;
  };

  export const Action: React.FC<any> & {
    CopyToClipboard: React.FC<any>;
    Push: React.FC<any>;
  };

  export const Detail: React.FC<any>;
}
