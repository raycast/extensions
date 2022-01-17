import { Toast, ToastStyle } from "@raycast/api";
import { setTimeout } from "timers/promises";

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

  const randomElement = answers[Math.floor(Math.random() * answers.length)];

  const toast = new Toast({ style: ToastStyle.Animated, title: "The Magic 8-Ball says.." });
  await toast.show();

  await setTimeout(350);

  toast.style = ToastStyle.Success;
  toast.title = randomElement;
};
