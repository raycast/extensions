import { Clipboard, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { canonicalizeForFiles, mutateFiles, readBatches, resolvePaths } from "./lib/service";
import { parseQuickTag } from "./lib/models";
import { errorMessage, failureText } from "./components/shared";

export default async function Command({ arguments: args }: LaunchProps<{ arguments: Arguments.QuickTag }>) {
  try {
    const mutation = parseQuickTag(args.tag);
    const paths = await resolvePaths();
    const current = await readBatches(paths);
    const tags = await canonicalizeForFiles(mutation.tags, current.files);
    const result = await mutateFiles(paths, { ...mutation, tags });
    if (result.failures.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${result.files.length} Updated, ${result.failures.length} Failed`,
        message: result.failures[0].message,
        primaryAction: { title: "Copy Failure Details", onAction: () => Clipboard.copy(failureText(result.failures)) },
      });
    } else {
      await showHUD(
        `${mutation.kind === "add" ? "Tagged" : "Untagged"} ${result.files.length} files ${tags.join(", ")}`,
      );
    }
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could Not Tag Files", message: errorMessage(error) });
  }
}
