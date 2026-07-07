import { type LaunchProps } from "@raycast/api";
import type { OutputFormat } from "@mcdays/cloudflare-images-core";
import { runUploadClipboard } from "./lib/upload-clipboard-impl.js";

/**
 * Argument shapes from the manifest's `arguments` entries. Both
 * dropdowns expose a "preference" sentinel as their default, meaning
 * "no Override; fall back to the user's preference".
 */
type FormatArg = "preference" | OutputFormat;
type SignedArg = "preference" | "signed" | "public";

function resolveFormatArg(arg: FormatArg | undefined): OutputFormat | null {
  return arg && arg !== "preference" ? arg : null;
}

function resolveSignedArg(arg: SignedArg | undefined): boolean | null {
  if (arg === "signed") return true;
  if (arg === "public") return false;
  return null;
}

/**
 * Default Upload Clipboard Image command. Reads two optional dropdown
 * arguments, `format` and `signed`, and delegates to the shared
 * `runUploadClipboard` implementation.
 *
 * For dedicated zero-arg hotkey variants on either axis, see the
 * format-locked (`upload-clipboard-markdown.tsx` etc.), signed-locked
 * (`upload-clipboard-signed.tsx` / `-public.tsx`), and combo-locked
 * (`upload-clipboard-signed-markdown.tsx` etc.) sibling files.
 */
export default async function UploadClipboardCommand(
  props: LaunchProps<{
    arguments: { format?: FormatArg; signed?: SignedArg };
  }>,
) {
  await runUploadClipboard({
    format: resolveFormatArg(props.arguments?.format),
    signed: resolveSignedArg(props.arguments?.signed),
  });
}
