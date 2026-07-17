import { runAppleScript } from "@raycast/utils";

type Input = {
  /** The markdown content of the new note */
  content: string;
};

export default async function tool(input: Input) {
  const encodedContent = encodeURIComponent(input.content);
  await runAppleScript(
    `tell application "Antinote"
      activate
      delay 0.3
      open location "antinote://x-callback-url/createNote?content=${encodedContent}"
    end tell`,
  );
  return "Note created successfully.";
}
