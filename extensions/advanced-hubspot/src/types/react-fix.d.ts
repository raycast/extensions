// Type fixes for Raycast API compatibility
declare module "react" {
  export type ReactNode = unknown;
}

declare module "@raycast/api" {
  import { FunctionComponent } from "react";

  export const List: FunctionComponent<unknown>;
  export const ActionPanel: FunctionComponent<unknown>;
  export const Action: FunctionComponent<unknown> & {
    CopyToClipboard: FunctionComponent<unknown>;
    OpenInBrowser: FunctionComponent<unknown>;
  };
  export const Form: FunctionComponent<unknown> & {
    TextField: FunctionComponent<unknown>;
    Description: FunctionComponent<unknown>;
  };
}
