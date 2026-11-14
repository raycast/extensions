import { LaunchProps, showHUD } from "@raycast/api";
import { getRows, setRows, updateRowSubtitle } from "./storage";

type Context = { refreshOnly?: boolean };

export default async function Command(
  props: LaunchProps<{ launchContext: Context }>,
) {
  if (props.launchContext?.refreshOnly) {
    await updateRowSubtitle(await getRows());
    return;
  }

  const rows = (await getRows()) + 1;
  await setRows(rows);
  await updateRowSubtitle(rows);
  await showHUD(`🧶 Row ${rows}`);
}
