import { LaunchProps, Toast, getSelectedFinderItems, popToRoot, showToast } from "@raycast/api";

import { importImage, parseKeywords } from "./lib/quickpic";

type AddSelectedImageArguments = {
  keywords: string;
  title?: string;
};

export default async function Command(
  props: LaunchProps<{ arguments: AddSelectedImageArguments }>,
) {
  const [selectedItem] = await getSelectedFinderItems();

  if (!selectedItem) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Finder image selected",
      message: "Select an image in Finder, then run the command again.",
    });
    return;
  }

  try {
    const item = await importImage({
      sourcePath: selectedItem.path,
      title: props.arguments.title,
      keywords: parseKeywords(props.arguments.keywords),
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Image added to QuickPic",
      message: item.title,
    });
    await popToRoot({ clearSearchBar: true });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not add selected image",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
