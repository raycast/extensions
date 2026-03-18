import {
  LaunchProps,
  open,
  getPreferenceValues,
  showToast,
  Toast,
  closeMainWindow,
} from "@raycast/api";

interface Preferences {
  addDirectly: boolean;
}

export default async function Command(
  props: LaunchProps<{ arguments: { text: string } }>,
) {
  const { text } = props.arguments;
  const { addDirectly } = getPreferenceValues<Preferences>();

  const encodedSentence = encodeURIComponent(text);
  const add = addDirectly ? "1" : "0";
  const url = `x-fantastical3://parse?s=${encodedSentence}&add=${add}`;

  await open(url);
  await closeMainWindow();

  await showToast({
    style: Toast.Style.Success,
    title: addDirectly
      ? "Event added to Fantastical"
      : "Event opened in Fantastical",
    message: text,
  });
}
