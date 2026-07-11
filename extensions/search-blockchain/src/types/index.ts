import { LaunchProps } from "@raycast/api";

export interface Item {
  title: string;
  url: string;
}

export type App = (query: string) => string | undefined;

export type CommandProps = LaunchProps<{
  arguments: {
    query: string;
  };
}>;
