import React from "react";

import type { FinderItemsFilter } from "../core";
import { useErrorBoundary, useSelectedFinder } from "../hooks";
import { renderSubComponent } from "../utils";

import { IdleScreen, IdleStop } from "./IdleScreen";

type FinderSelectedProps = {
  filter: FinderItemsFilter;
  children: (items: string[]) => React.ReactNode;
};

export const FinderSelected: React.FC<FinderSelectedProps> = ({ filter, children }) => {
  const { items, error, pending } = useSelectedFinder(filter);
  const { ErrorBoundary } = useErrorBoundary(error);

  if (items?.length) {
    return <IdleStop>{renderSubComponent<string[]>(items, children)}</IdleStop>;
  }

  return (
    <ErrorBoundary toastErrorTitle={`Error getting Finder selected ${filter}`}>
      <IdleScreen title={`Getting Finder selected ${filter}...`} pending={pending} />
    </ErrorBoundary>
  );
};
