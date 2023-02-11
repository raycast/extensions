import { clearSearchBar, Detail, List } from "@raycast/api";
import { existsSync } from "node:fs";
import { useContext, useEffect } from "react";
import { getExtPreferences } from "../preferences";
import { DirectoryProps } from "../types";
import { createItem, getDirectoryData } from "../utils";
import { AppContext } from "../utils/AppContext";

export function Directory(props: DirectoryProps) {
  const { path: pathFromProp } = props;
  const { directoriesFirst } = getExtPreferences();

  const { path: pathFromContext, markFinishRenderingDirectory, shouldReRender } = useContext(AppContext);

  const shouldGetPathFromContext = shouldReRender() && pathFromContext;
  const path = shouldGetPathFromContext ? pathFromContext : pathFromProp;
  const isPathExisted = existsSync(path);

  // when rendering directories from path in context, we will mark it as a used state so we won't need to render it again.
  useEffect(() => {
    if (shouldGetPathFromContext) {
      // since we don't use push/pop UI view in the stack, we need to clearn search bar manually.
      clearSearchBar().then(markFinishRenderingDirectory);
    }
  }, [shouldGetPathFromContext]);

  if (!isPathExisted) {
    return <Detail markdown={`# Error: \n\nThe directory \`${path}\` does not exist. `} />;
  }

  const directoryData = getDirectoryData(path);
  // avoid duplicated `/` in text
  const hintText = `Search in ${path === "/" ? "" : path}/`;

  if (directoriesFirst) {
    const directories = directoryData.filter((file) => file.type === "directory");
    const nonDirectories = directoryData.filter((file) => file.type !== "directory");

    return (
      <List searchBarPlaceholder={hintText}>
        <List.Section title="Directories">{directories.map((data) => createItem(data))}</List.Section>
        <List.Section title="Files">{nonDirectories.map((data) => createItem(data))}</List.Section>
      </List>
    );
  } else {
    return <List searchBarPlaceholder={hintText}>{directoryData.map((data) => createItem(data))}</List>;
  }
}
