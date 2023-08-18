import { updateCommandMetadata } from "@raycast/api";
import { LocalStorage, launchCommand, LaunchType } from "@raycast/api";

export default async function Command({ launchContext }) {
  let counter = parseInt((await LocalStorage.getItem("counter")) ?? 0);
  if (!launchContext?.noUpdate) {
    counter--;
    await LocalStorage.setItem("counter", counter);
    await launchCommand({ name: "increment-counter", type: LaunchType.Background, context: { noUpdate: true } });
  }
  await updateCommandMetadata({ subtitle: `Value: ${counter}` });
}
