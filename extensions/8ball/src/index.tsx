import { Clipboard, getPreferenceValues, Toast, ToastStyle } from "@raycast/api";
import { setTimeout } from "timers/promises";

type Prefs = { defaultAction: "copy" | "paste" };

export default async () => {
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

  // Show animated toast while “thinking”
  const toast = new Toast({ style: ToastStyle.Animated, title: "The Magic 8-Ball says.." });
  await toast.show();
  await setTimeout(350);

  // Read user preference and perform the chosen action
  const { defaultAction } = getPreferenceValues<Prefs>();

  if (defaultAction === "paste") {
    await Clipboard.paste(answer); // types into the active app
    toast.style = ToastStyle.Success;
    toast.title = answer;
    toast.message = "Pasted to current app";
  } else {
    await Clipboard.copy(answer); // copies to clipboard
    toast.style = ToastStyle.Success;
    toast.title = answer;
    toast.message = "Copied to clipboard";
  }
};
