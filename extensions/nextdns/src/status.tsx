import { updateCommandMetadata } from "@raycast/api";
import { connectionStatus } from "./libs/api";
export default async function Main() {
  const status = await connectionStatus();
  await updateCommandMetadata({ subtitle: status });
}
