import { dispatchTinkerCommand } from "./lib/tinker";

export default async function Command() {
  await dispatchTinkerCommand({
    command: "record-area",
  });
}
