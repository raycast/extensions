import { asURL, callTool, parseFolders } from "./anycap";

export type CaptureValues = { type: string; title: string; url: string; body: string; folder: string; tags: string };

export function captureArguments(values: CaptureValues): Record<string, string> {
  const content = (values.type === "link" ? values.url : values.body)?.trim() ?? "";
  if (!content) throw new Error(values.type === "link" ? "Enter a link." : "Write a note.");
  if (values.type === "link" && !asURL(content)) throw new Error("Enter an http or https link.");
  return {
    ...(values.type === "link" ? { url: content } : { text: values.body }),
    title: values.title.trim(),
    category: values.folder || "Inbox",
    tags: values.tags.trim(),
  };
}

export async function submitCapture(values: CaptureValues, client = "Raycast"): Promise<string> {
  const args = captureArguments(values);
  if (args.category !== "Inbox") {
    const folders = parseFolders(await callTool("categories", {}, client));
    if (!folders.some((folder) => folder.name === args.category))
      throw new Error("That folder no longer exists. Choose Inbox or another folder.");
  }
  const reply = await callTool("save", args, client);
  if (!reply.startsWith("Saved")) throw new Error(reply || "Capture was not saved.");
  return reply;
}
