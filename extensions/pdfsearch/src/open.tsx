import { Action, ActionPanel, getSelectedFinderItems, List, popToRoot } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import fs from "fs";
import { drawImage, getPDFOutline } from "swift:../swift";
import { Outline } from "./type";
import { cache, openFileCallback } from "./utils";

export default function Command() {
  const { data, isLoading } = usePromise(async () => {
    try {
      const files = await getSelectedFinderItems();
      if (files.length === 0) throw Error("No files selected!");
      const outlinePromises = files.map(async (f) => {
        try {
          const fileOutlines: Outline[] = await getPDFOutline(f.path);
          fileOutlines.forEach((o) => {
            o.file = f.path;
          });
          return fileOutlines;
        } catch {
          return [];
        }
      });
      const outlines = (await Promise.all(outlinePromises)).flat();
      if (outlines.length === 0) throw new Error("Not outlines from selected files!");
      return outlines;
    } catch (err) {
      showFailureToast(err as string);
      await popToRoot();
    }
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search PDF outline..." isShowingDetail>
      {data?.map((outline, i) => (
        <List.Item
          key={i}
          title={outline.title}
          subtitle={`Page ${outline.page + 1}`}
          actions={
            <ActionPanel>
              <Action.Open target={outline.file} onOpen={() => openFileCallback(outline.page)} title="Open File" />
              <Action.OpenWith
                path={outline.file}
                onOpen={() => openFileCallback(outline.page)}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
            </ActionPanel>
          }
          detail={<OutlineDetail outline={outline} filepath={outline.file} />}
        />
      ))}
    </List>
  );
}

function OutlineDetail({ outline, filepath }: { outline: Outline; filepath: string }) {
  const { data: imagePath, isLoading } = usePromise(async () => {
    try {
      const key = `${outline.title}_${outline.page}`;
      const tmpPath = cache.get(key);
      // if file still exists in temp directory render it straightaway
      if (tmpPath && fs.existsSync(tmpPath)) {
        return tmpPath;
      } else {
        const newPath = await drawImage(filepath, outline.page);
        cache.set(key, newPath);
        return newPath;
      }
    } catch (err) {
      showFailureToast(`Error occurred when drawing page: ${err}`);
    }
  });

  return <List.Item.Detail isLoading={isLoading} markdown={`![Page ${outline.page}](${imagePath})`} />;
}
