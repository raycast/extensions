import { LocalStorage, launchCommand, LaunchType } from "@raycast/api";

export default async function Command() {
  let counter = 0;
  await LocalStorage.setItem("counter", counter);
  await launchCommand({ name: "decrement-counter", type: LaunchType.Background, context: { noUpdate: true } });
  await launchCommand({ name: "increment-counter", type: LaunchType.Background, context: { noUpdate: true } });
}
