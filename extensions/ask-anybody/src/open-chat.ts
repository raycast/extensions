import { open, closeMainWindow, popToRoot, showToast, Toast, LaunchProps } from "@raycast/api";

export async function openChat(
  props: LaunchProps<{ arguments: { query: string } }>,
  name: string,
  urlTemplate: (query: string) => string,
  application?: string,
) {
  const { query } = props.arguments;
  try {
    await open(urlTemplate(query), application);
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
