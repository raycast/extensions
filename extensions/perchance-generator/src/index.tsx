import {
  Detail,
  ActionPanel,
  Action,
  LaunchProps,
  getPreferenceValues,
  Toast,
  showToast,
  popToRoot,
  Icon,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  project: string;
}

export default function Command(props: LaunchProps) {
  const preferences = getPreferenceValues<Preferences>();
  const { project } = props.arguments;
  const selectedGenerator = project === "" ? preferences.project : project;

  try {
    const { isLoading, data, revalidate } = useFetch(
      "https://cat-sequoia-parcel.glitch.me/api?generator=" + selectedGenerator + "&list=output"
    );

    if (String(data) == "undefined") {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "That generator might not exist 🙁" });
      popToRoot();
    } else {
      const markdownData = isLoading ? "Loading..." : data;

      return (
        <Detail
          isLoading={isLoading}
          markdown={`# ${markdownData}`}
          actions={
            <ActionPanel>
              <Action title="Reload" icon={Icon.RotateClockwise} onAction={() => revalidate()} />
              <Action.Paste content={`${data}`} />
              <Action.CopyToClipboard content={`${data}`} />
              <Action.OpenInBrowser url={`https://perchance.org/${selectedGenerator}`} />
            </ActionPanel>
          }
        />
      );
    }
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: "Something went wrong" });
  }
}
