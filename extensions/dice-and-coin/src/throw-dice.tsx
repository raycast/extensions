import { showToast, Toast } from "@raycast/api";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Throwing die..." });
  const result: string = Math.ceil(Math.random() * 6).toString();
  await wait(600);
  toast.style = Toast.Style.Success;
  toast.title = `🎲 ${result}`;
  await wait(1000);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
