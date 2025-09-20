import { open } from "@raycast/api";
import { getApp } from "#/apps";
import type { CommandProps } from "#/types";

export default function Search(props: SearchProps) {
  const {
    appName,
    arguments: { query },
  } = props;

  const app = getApp(appName);
  const url = app(query);

  if (!url) {
    throw new Error("Invalid query");
  }

  open(url);
}

export interface SearchProps extends CommandProps {
  appName: string;
}
