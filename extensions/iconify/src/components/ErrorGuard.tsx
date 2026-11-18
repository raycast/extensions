import { Detail } from "@raycast/api";
import { PropsWithChildren } from "react";

type ErrorGuardProps = PropsWithChildren<{
  error?: Error;
}>;

export const ErrorGuard = ({ error, children }: ErrorGuardProps) => {
  if (error) {
    return (
      <Detail
        markdown={`# Error

An error occurred while loading the data. Please try the following things:
- Reinstall the extension
- Clear the cache of the extension
- Check your internet connection

Reported error: \`${error.message}\``}
      />
    );
  }
  return children;
};
