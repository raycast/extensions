import Ray from "@raycast/api";
import { setTimeout } from "timers/promises";

type Prefs = { defaultAction: "copy" | "paste" };

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

  const toast = new Ray.Toast({ style: Ray.ToastStyle.Animated, title: "The Magic 8-Ball says.." });
  await toast.show();
  await setTimeout(350);

  const { defaultAction } = Ray.getPreferenceValues<Prefs>();

  if (defaultAction === "paste") {
    await Ray.Clipboard.paste(answer);
    toast.style = Ray.ToastStyle.Success;
    toast.title = answer;
    toast.message = "Pasted to current app";
  } else {
    await Ray.Clipboard.copy(answer);
    toast.style = Ray.ToastStyle.Success;
    toast.title = answer;
    toast.message = "Copied to clipboard";
  }
}
