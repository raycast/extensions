import { Tool } from "@raycast/api";
import { getClient } from "../lib/api";

type Input = {
  penId: string;
  /** Exact version.id returned by Get Pen after its build settled. Never guess or substitute a newer ID without re-reading the files. */
  expectedVersionId: string;
  /** Complete replacement content for each path. Other files are preserved. */
  files: { path: string; content: string }[];
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Save and build these source files? CodePen may also deploy them if auto-deploy is enabled.",
  info: [
    { name: "Pen ID", value: input.penId },
    { name: "Based on Version", value: input.expectedVersionId },
    ...input.files.map((file) => ({ name: file.path, value: file.content })),
  ],
});
/**
 * Read with get-pen first and pass that version.id. Never write Classic Pens or while a build
 * is pending. Files are saved even if the returned build fails; do not retry that save.
 * After a settled build, read the source again because the compiler may have changed it.
 */
export default function tool(input: Input) {
  return getClient().writeFiles(input.penId, input.expectedVersionId, input.files);
}
