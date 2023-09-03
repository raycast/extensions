import { showToast, Toast, Clipboard, getPreferenceValues, LaunchProps, open } from "@raycast/api";
import fetch from "node-fetch"; // v2.6.1
interface Preferences {
  project: string;
}

export default async function Command(props: LaunchProps) {
  showToast(Toast.Style.Animated, "Generating...");
  const preferences = getPreferenceValues<Preferences>();
  const { project } = props.arguments;
  try {
    const generatorName = project === "" ? preferences.project : project;

    console.log(project); // <-- change this to your generator name
    const html = await fetch(`https://cat-sequoia-parcel.glitch.me/api?generator=${generatorName}&list=output`).then(
      (r) => r.text()
    );
    console.log(html);
    const options: Toast.Options = {
      style: Toast.Style.Success,
      title: "Generated!",
      message: html,
      primaryAction: {
        title: "Copy to Clipboard",
        onAction: (toast) => {
          console.log("The toast action has been triggered");
          toast.hide();
          Clipboard.copy(html);
        },
      },
    };
    await showToast(options);
    await open("raycast://confetti");
    await open("raycast://");
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Something went wrong. Please try again.",
    });
  }
}
