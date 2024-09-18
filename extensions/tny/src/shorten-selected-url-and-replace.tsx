import Client from "./utils/Client";
import linkCreate from "./mutations/linkCreate";
import { authorize } from "./utils/Auth";
import { getSelectedUrlFromClipboard } from "./utils/Clipboard";
import { Clipboard, showToast, Toast, showHUD } from "@raycast/api";

export default async function Command() {
  const urlToShorten = await getSelectedUrlFromClipboard();

  if (!urlToShorten) {
    return;
  }

  await authorize();

  const defaultErrorMessage = "Unable to shorten the given URL!";

  try {
    const { data } = await Client.mutate({
      mutation: linkCreate,
      variables: {
        url: urlToShorten,
      },
    });

    const response = data.linkCreate;

    if (!response.status.success) {
      await showToast({
        title: "Error",
        style: Toast.Style.Failure,
        message: response.status.errors[0].messages[0] ?? defaultErrorMessage,
      });

      return;
    }

    const shortUrl = response.link.url;

    const newUrl: Clipboard.Content = {
      text: shortUrl,
    };

    await Clipboard.paste({
      text: newUrl.text,
    });

    await showToast({
      title: "Created a Tny URL",
      style: Toast.Style.Success,
      message: "Replaced selected URL with Tny URL!",
    });

    await showHUD("Successfully replaced URL with Tny URL!");
  } catch (error) {
    console.error(error);

    await showToast({
      title: "Error",
      style: Toast.Style.Failure,
      message: defaultErrorMessage,
    });
  }
}
