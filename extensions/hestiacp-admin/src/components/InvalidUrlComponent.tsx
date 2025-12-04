import { showFailureToast } from "@raycast/utils";
import ErrorComponent from "./ErrorComponent";

export default function InvalidUrlComponent() {
  const error = new Error("Please make sure you have entered a valid URL in Preferences", { cause: "Invalid URL" });
  showFailureToast(error, { title: "Invalid URL" });
  return <ErrorComponent error={error} />;
}
