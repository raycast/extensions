/**
 * LoadingView Component
 * Reusable loading state component with customizable message and spinner
 */

import React from "react";
import { List, Icon } from "@raycast/api";
import { LoadingViewProps } from "../../types/ui";

export const LoadingView = React.memo<LoadingViewProps>(({ message = "Loading...", showSpinner = true }) => {
  return (
    <List isLoading={showSpinner}>
      <List.EmptyView icon={Icon.Clock} title={message} description={showSpinner ? undefined : "Please wait..."} />
    </List>
  );
});

LoadingView.displayName = "LoadingView";
