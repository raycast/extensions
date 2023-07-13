import { Toast, showToast } from "@raycast/api";
import { decodeTime, isValid } from "ulidx";
import { getCurrentTimestamp, getDate, getRelativeTime, toDateString } from "./util/time";

import { contents } from "./util/clipboard";

async function ulidToTime() {
  try {
    const clipboard = await contents();
    if (!isValid(clipboard)) throw "not a valid ulid string";
    const decodedTime = decodeTime(clipboard);
    const d = getDate(decodedTime);
    const ds = toDateString(d);
    const now = getDate(getCurrentTimestamp());
    const relative = getRelativeTime(d, now);

    const text = `${ds} (${relative})`;

    showToast({
      style: Toast.Style.Success,
      title: text,
    });
  } catch (e) {
    if (typeof e === "string") {
      await showToast(Toast.Style.Failure, "Decode failed", e);
    }
  }
}

export default async function Command() {
  await ulidToTime();
}
