import {
  open,
  closeMainWindow,
  popToRoot,
  showToast,
  Toast,
  LaunchProps,
} from "@raycast/api";

interface Arguments {
  query: string;
}

export async function openChat(
  props: LaunchProps<{ arguments: Arguments }>,
  name: string,
  urlTemplate: (query: string) => string,
) {
  const { query } = props.arguments;
  try {
    await open(urlTemplate(query));
    await closeMainWindow();
    await popToRoot({ clearSearchBar: true });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to open ${name}`,
      message: String(error),
    });
  }
}
