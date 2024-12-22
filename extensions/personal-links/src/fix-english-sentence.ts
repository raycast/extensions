import { open } from "@raycast/api";

export default async function Command() {
  await open(
    "https://chatgpt.com/g/g-674b1c070a28819193b1e8b6ceb4ba8a-fix-the-sentence-in-english?temporary-chat=true",
  );
}
