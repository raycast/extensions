import { getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { JsonTreeView } from "./jsonTreeView";
import { formatJS } from "./utils";

export default function Command() {
  const { data: output, isLoading } = usePromise(async () => {
    const text = await getSelectedText();
    return formatJS(text);
  });

  return <JsonTreeView json={output || ""} isLoading={isLoading} />;
}
