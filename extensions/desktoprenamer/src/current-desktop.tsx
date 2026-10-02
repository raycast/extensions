import { updateCommandMetadata } from "@raycast/api";
import { getCurrentSpaceName } from "./utils";

export default async function Command() {
  try {
    const result = await getCurrentSpaceName();

    if (result) {
      const name = result.trim();
      await updateCommandMetadata({ subtitle: `${name}` });
    }
  } catch {
    await updateCommandMetadata({ subtitle: "Connection Failed" });
  }
}
