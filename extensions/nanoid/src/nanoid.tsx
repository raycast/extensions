import { Clipboard, showHUD, LaunchProps } from "@raycast/api";
import { nanoid } from "nanoid";

export default async (props: LaunchProps<{ arguments: Arguments.Nanoid }>) => {
  const len = props?.arguments.len;
  let id: string | null = null;
  if (len && !isNaN(parseInt(len))) {
    id = nanoid(parseInt(len));
  } else {
    id = nanoid();
  }

  await Clipboard.copy(id);
  await showHUD(`✅ Copied ${id}`);
};
