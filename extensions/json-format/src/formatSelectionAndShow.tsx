import { getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { FormattedJsonDetail } from "./formattedJsonDetail";
import { formatJS } from "./utils";

export default function Command() {
  const { data: output } = usePromise(async () => await formatJS(await getSelectedText()));
  return <FormattedJsonDetail json={output || []} />;
}
