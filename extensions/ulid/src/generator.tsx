import { Toast, showToast } from "@raycast/api";

import { ulid } from "ulidx";
import { update } from "./util/clipboard";

async function generate() {
  try {
    await update(ulid());
  } catch (e) {
    if (typeof e === "string") {
      await showToast(Toast.Style.Failure, "Encode failed", e);
    }
  }
}

export default async function Command() {
  await generate();
}
