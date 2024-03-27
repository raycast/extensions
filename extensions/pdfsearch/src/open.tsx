import { Action, ActionPanel, List, environment, popToRoot } from "@raycast/api";
import { runAppleScript, showFailureToast, usePromise } from "@raycast/utils";
import { execa } from "execa";
import { chmod } from "fs/promises";
import path from "path";
import { openFileCallback } from "./utils";

interface Outline {
  title: string;
  page: number;
}

const selectFile = async () => {
  try {
    const file = await runAppleScript(
      `
set selectedFile to choose file with prompt "Please select a PDF file" of type ("pdf")
set raycastPath to POSIX path of (path to application "Raycast")
do shell script "open " & raycastPath
return POSIX path of selectedFile
            `,
    );
    const command = path.join(environment.assetsPath, "GetOutline");
    await chmod(command, "755");
    const process = execa(command, [file]);
    const { stdout, exitCode } = await process;
    if (exitCode === 0) {
      const outline: Outline[] = JSON.parse(stdout);
      return { file, outline };
    }
    throw new Error();
  } catch (error) {
    await popToRoot();
    showFailureToast("PDF document does not have an outline!");
  }
};
export default function Command() {
  const { data, isLoading } = usePromise(selectFile);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search PDF outline..." isShowingDetail throttle>
      {data?.outline?.map((outline, i) => (
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
          detail={<Detail outline={outline} filepath={data.file} />}
        />
      ))}
    </List>
  );
}

function Detail({ outline, filepath }: { outline: Outline; filepath: string }) {
  const { data: imagePath, isLoading } = usePromise(async () => {
    try {
      // execute swift binary that will draw image of pdf page and highlght search result
      const command = path.join(environment.assetsPath, "DrawImage");
      await chmod(command, "755");
      const { stdout, exitCode } = await execa(command, [filepath, String(outline.page)]);
      if (exitCode === 0) {
        return stdout;
      }
    } catch {
      // catch process cancellation exception that is triggered when query changes
    }
  });

  return <List.Item.Detail isLoading={isLoading} markdown={`![Page ${outline.page}](${imagePath})`} />;
}
