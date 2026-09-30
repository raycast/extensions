import { LaunchProps, Toast } from "@raycast/api";
import { readLater } from "./utils/api";
import { closeAndShowToast } from "./utils/closeAndShowToast";
import { getUrl } from "./utils/getUrl";
import { refreshMenuBar } from "./utils/refreshMenuBar";

export default async function Main(
  props: LaunchProps<{ arguments: Arguments.ReadLater }>,
) {
  const url = await getUrl(props.arguments.url);
  if (url === undefined) return;

  try {
    await closeAndShowToast(Toast.Style.Animated, `Saving ${url}`);
    const entry = await readLater(url.toString());
    if (entry && entry.id) {
      await closeAndShowToast(
        Toast.Style.Success,
        `Saved ${entry.url} to Read Later`,
      );
      refreshMenuBar();
    } else {
      await closeAndShowToast(
        Toast.Style.Failure,
        "Failed to save to read later",
      );
    }
  } catch (error) {
    await closeAndShowToast(Toast.Style.Failure, "Unable to reach Feedbin API");
  }
}
