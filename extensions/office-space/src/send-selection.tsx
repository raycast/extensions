import { Detail, getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { SendForm } from "./components/SendForm";

export default function Command() {
  const { data, isLoading, error } = usePromise(getSelectedText);
  if (error) return <Detail markdown={"## No text selected\n\nSelect some text in any app, then run this command."} />;
  if (isLoading || data === undefined) return <Detail isLoading markdown="" />;
  return <SendForm payload={{ kind: "Send Selection to Agent", selection: data }} />;
}
