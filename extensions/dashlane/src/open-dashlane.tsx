import { open, showToast, Toast, useNavigation } from "@raycast/api";

export default () => {
  const { pop } = useNavigation();
  open("https://app.dashlane.com")
    .then(() => pop())
    .catch(async () => {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open your browser",
      });
    });
};
