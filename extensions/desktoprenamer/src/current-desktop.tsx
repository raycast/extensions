import { updateCommandMetadata } from "@raycast/api";
import { runDesktopRenamerCommand } from "./utils";

export default async function Command() {
  try {
    const result = await runDesktopRenamerCommand("get current space name");

    if (result) {
      const name = result.trim();
      await updateCommandMetadata({ subtitle: `${name}` });
    }
  } catch {
    await updateCommandMetadata({ subtitle: "Connection Failed" });
  }
}
