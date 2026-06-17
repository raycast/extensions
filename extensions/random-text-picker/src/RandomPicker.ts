import { Alert, Icon, Toast, confirmAlert, environment, showToast } from "@raycast/api";
import { exec } from "child_process";

export default async function RandomPicker(
  inputs: string[],
  setInputs: (arg0: string[]) => void,
  setIsLoading: (arg0: boolean) => void
) {
  // show animated raycast toast
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Randomizing...`,
  });

  // play drumroll sound
  const drumrollAudio = "tadaa-47995.mp3";
  const command = `afplay "${environment.assetsPath + "/" + drumrollAudio}"`;
  exec(command, (error, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
  });

  // show loading animation on search bar
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  setIsLoading(true);
  await wait(2000);
  setIsLoading(false);
  toast.hide();

  // randomize inputs
  const randomIndex = Math.floor(Math.random() * inputs.length);
  const output = inputs[randomIndex];
  await confirmAlert({
    title: `The winner is: ${output}!`,
    icon: Icon.Trophy,
    message: "Remove this from the list?",
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
      onAction: () => {
        setInputs(inputs.filter((i) => i !== output));
      },
    },
  });
}
