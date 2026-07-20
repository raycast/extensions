import { Clipboard, getPreferenceValues, Toast } from "@raycast/api";
import { setTimeout } from "timers/promises";

export default async function Command() {
  const answers: string[] = [
    "Nah, don't do it.",
    "Nope",
    "Never!!",
    "Definitely not.",
    "Anything but that.",
    "No.",
    "NO!",
    "You know what to do.",
    "You have to ask?!",
    "Ask me another time.",
    "I really don't know..",
    "Sorry, I don't care.",
    "Yes.",
    "YES!",
    "YEAH!!",
    "Of course!",
    "Yesss.",
    "Yup.",
    "I'm sure.",
    "Certainly.",
    "Why not?",
    "Can't think of any reason why not.",
  ];

  const answer = answers[Math.floor(Math.random() * answers.length)];

  const toast = new Toast({ style: Toast.Style.Animated, title: "The Magic 8-Ball says.." });
  await toast.show();
  await setTimeout(350);

  const { defaultAction } = getPreferenceValues<Preferences.Index>();

  toast.style = Toast.Style.Success;
  toast.title = answer;

  if (defaultAction === "paste") {
    await Clipboard.paste(answer);
    toast.message = "Pasted to current app";
  } else if (defaultAction === "copy") {
    await Clipboard.copy(answer);
    toast.message = "Copied to clipboard";
  }
}
