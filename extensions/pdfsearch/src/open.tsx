import { Action, ActionPanel, List, popToRoot } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import fs from "fs";
import { cache, openFileCallback, selectPDFFile } from "./utils";
import { drawImage, getPDFOutline } from "swift:../swift";

interface Outline {
  title: string;
  page: number;
}

export default function Command() {
  const { data, isLoading } = usePromise(async () => {
    try {
      const file = await selectPDFFile();
      const outlines: Outline[] = await getPDFOutline(file);
      return { outlines, file };
    } catch (err) {
      showFailureToast(`Failed to get document outline. ${err}`);
      await popToRoot();
    }
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search PDF outline..." isShowingDetail>
      {data?.outlines?.map((outline, i) => (
        <List.Item
          key={i}
          title={outline.title}
          subtitle={`Page ${outline.page + 1}`}
          actions={
            <ActionPanel>
              <Action.Open target={data.file} onOpen={() => openFileCallback(outline.page)} title="Open File" />
              <Action.OpenWith
                path={data.file}
                onOpen={() => openFileCallback(outline.page)}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
            </ActionPanel>
          }
          detail={<OutlineDetail outline={outline} filepath={data.file} />}
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
