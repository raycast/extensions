import { Clipboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ConversionForm } from "./ConversionForm";

/** Reads the clipboard once when shown (only reachable through an explicit user command) and lets the user edit it. */
export function ClipboardConversion() {
  const { data, isLoading, error } = usePromise(async () => (await Clipboard.readText()) ?? "");
  if (error) {
    return (
      <ConversionForm key="failed" info="Could not read the clipboard. Enter text below, or run the command again." />
    );
  }
  if (isLoading || data === undefined) return <ConversionForm key="loading" info="Reading the clipboard…" />;
  return (
    <ConversionForm
      key="loaded"
      initialText={data}
      info={
        data.trim()
          ? "Review and edit the clipboard text before you convert it."
          : "The clipboard has no text. Enter text below."
      }
    />
  );
}
