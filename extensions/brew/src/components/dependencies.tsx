/**
 * Dependencies component for displaying package dependencies.
 *
 * Shows a list of dependencies with installation status indicators.
 */

import React from "react";
import { Detail, Color } from "@raycast/api";

interface DependenciesProps {
  title: string;
  dependencies?: string[];
  isInstalled: (name: string) => boolean;
}

/**
 * Display a list of dependencies with installation status.
 */
export function Dependencies({ title, dependencies, isInstalled }: DependenciesProps) {
  if (!dependencies || dependencies.length === 0) {
    return null;
  }

  return (
    <Detail.Metadata.TagList title={title}>
      {dependencies.map((dep) => (
        <Detail.Metadata.TagList.Item
          key={dep}
          text={dep}
          color={isInstalled(dep) ? Color.Green : Color.SecondaryText}
        />
      ))}
    </Detail.Metadata.TagList>
  );
}
