import { ActionPanel, Action, List as RaycastList } from "@raycast/api";
import { readdirSync, Dirent, statSync } from "fs"; // Import statSync to access file details

const dir = "/Users/azyz/Documents/Nintendo DS";

export default function Command() {
  // Read the directory contents without sorting
  const dirContents = readdirSync(dir, { withFileTypes: true });

  // Collect only files into the dirFiles array
  const dirFiles: Dirent[] = [];

  dirContents.forEach((item) => {
    if (item.name.charAt(0) !== "." && item.isFile()) {
      dirFiles.push(item);
    }
  });

  return (
    <RaycastList>
      {dirFiles.map((value, index) => {
        // Construct the full path for the icon
        const filePath = `${dir}/${value.name}`;

        // Determine the icon based on the file type
        const fileIcon = statSync(filePath).isDirectory()
          ? { source: "folder" } // Use folder icon for directories if included
          : { fileIcon: filePath }; // Use the file's icon

        return (
          <RaycastList.Item
            key={index} // Using index as the key
            icon={fileIcon}
            title={value.name}
            actions={
              <ActionPanel>
                <Action.Open title={`Open ${value.name}`} target={filePath} />
              </ActionPanel>
            }
          />
        );
      })}
    </RaycastList>
  );
}
