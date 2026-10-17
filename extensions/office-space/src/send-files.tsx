import { Detail, getSelectedFinderItems } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { statSync } from "node:fs";
import { SendForm } from "./components/SendForm";

export default function Command() {
  const { data, isLoading, error } = usePromise(async () => {
    const items = await getSelectedFinderItems();
    return items.map((item) => item.path).filter((path) => statSync(path).isFile());
  });
  if (isLoading) return <Detail isLoading markdown="" />;
  if (error || !data || data.length === 0) {
    return (
      <Detail
        markdown={"## No files selected\n\nSelect one or more files in Finder (not folders), then run this command."}
      />
    );
  }
  return <SendForm payload={{ kind: "Send Files to Agent", files: data }} />;
}
