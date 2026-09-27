import { CycleLaunchProps, cycleWindow } from "./cycle-window";

export default async function Command(props: CycleLaunchProps) {
  await cycleWindow(1, props.arguments.app ?? "");
}
