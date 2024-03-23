import React from "react";

import { dirname } from "path";
import { statSync } from "fs";
import { FileSystemItem, getSelectedFinderItems } from "@raycast/api";

import { FinderItemsFilter } from "../core";
import { FinderError } from "../utils";

type SelectedItemsState = {
  items: string[] | null;
  error: Error | null;
  pending: boolean;
};

const defaultState = {
  items: null,
  error: null,
  pending: true,
};

const reducer = (state: SelectedItemsState, update: Partial<SelectedItemsState>) => {
  return {
    ...state,
    ...update,
    pending: update.items !== null || update.error !== null,
  };
};

const getDirectories = (items: FileSystemItem[]) => {
  if (items?.length) {
    const paths = new Set<string>();

    items.forEach((item) => {
      const stats = statSync(item.path);

      if (stats.isDirectory()) {
        paths.add(item.path);
      } else {
        paths.add(dirname(item.path));
      }
    });

    return [...paths].sort();
  }

  return [];
};

const getFiles = (items: FileSystemItem[]) => {
  if (items?.length) {
    const newPaths = new Set<string>();

    items.forEach((item) => {
      const stats = statSync(item.path);

      if (stats.isFile()) {
        newPaths.add(item.path);
      }
    });

    return [...newPaths].sort();
  }

  return [];
};

export const useSelectedFinder = (typeFilter: FinderItemsFilter) => {
  const [{ items, pending, error }, dispatch] = React.useReducer(reducer, defaultState);

  const setError = (error: Error | null) => dispatch({ error });
  const setItems = (items: string[] | null) => dispatch({ items });

  React.useEffect(() => {
    getSelectedFinderItems()
      .then((items) => (typeFilter === "files" ? getFiles(items) : getDirectories(items)))
      .then((selected) => (selected.length === 0 ? setError(new FinderError("No files selected")) : setItems(selected)))
      .catch((error) => setError(new FinderError(error)));
  }, []);

  return { items, error, pending };
};
