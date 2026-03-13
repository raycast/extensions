import { getSelectedFinderItems } from "@raycast/api";

// Gets the path of the selected file in Finder
export const getLocalImagePath = async () => {
  const fileSystemItems = await getSelectedFinderItems();

  console.log(fileSystemItems);

  if (fileSystemItems.length === 0) {
    throw new Error("No file selected.");
  } else if (fileSystemItems.length > 1) {
    throw new Error("Please select only one file.");
  } else {
    const [file] = fileSystemItems;
    const filePath = file.path.endsWith("/") && file.path.length !== 1 ? file.path.slice(0, -1) : file.path;
    return filePath;
  }
};
