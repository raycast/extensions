import { getSelectedFinderItems, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import fs from "fs";

export default async function main(props: LaunchProps) {
  if (props.launchContext?.path) {
    await updateFileContents(props.launchContext?.path);
    await showHUD("File updated!");
  } else {
    try {
      const [transcriptFile] = await getSelectedFinderItems();
      await updateFileContents(transcriptFile.path);
      await showHUD("File updated!");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot find file.",
        message: "Make sure the file is selected in Finder",
      });
    }
  }
}

async function updateFileContents(filePath: string): Promise<void> {
  if (!filePath.endsWith(".txt")) {
    throw new Error("The file must have a .txt extension");
  }
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf-8", (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      const updatedData = convertInput(data);

      fs.writeFile(filePath, updatedData, "utf-8", (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  });
}

function convertInput(input: string) {
  const lines = input.split("\n");
  const output = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\[\d\d:\d\d:\d\d\].+/)) {
      const title = lines[i].split("]")[1].trim();
      if (title !== "") {
        output.push(lines[i].split("---")[0].trim());
      }
    }
  }

  return output.join("\n");
}
