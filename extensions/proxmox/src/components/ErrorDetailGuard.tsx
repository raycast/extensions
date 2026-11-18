import type { PropsWithChildren } from "react";
import { List } from "@raycast/api";

type ErrorDetailGuardProps = PropsWithChildren<{
  showErrorScreen?: boolean;
}>;

export const ErrorDetailGuard = ({ children, showErrorScreen }: ErrorDetailGuardProps) => {
  if (showErrorScreen) {
    return <List.Item.Detail markdown="Something went wrong, check your preferences." />;
  }

  return children;
};
