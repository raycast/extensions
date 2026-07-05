import { showToast, Toast, LaunchProps } from "@raycast/api";
import { shorten } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.ShortenUrlWithargs }>) {
  const toast = await showToast(Toast.Style.Animated, "Shortening URL");
  try {
    const { url } = props.arguments;
    await shorten(url);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${error}`;
  }
}
