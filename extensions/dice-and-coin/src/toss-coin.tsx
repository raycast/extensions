import { showToast, Toast } from "@raycast/api";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Tossing coin..." });
  const flip: string = Math.random() > 0.5 ? "Heads" : "Tails";
  await wait(600);
  toast.style = Toast.Style.Success;
  toast.title = `🪙 ${flip}!`;
  await wait(1000);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
