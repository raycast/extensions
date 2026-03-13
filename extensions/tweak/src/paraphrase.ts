import { runPolish } from "./runner";

export default async function Command() {
  const defaultPrompt =
    "Rewrite this in clear, simple English while keeping the original meaning unchanged. Only output the improved version, without explanations.";
  await runPolish(defaultPrompt, "Paraphrased");
}
