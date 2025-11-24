import { FormValues } from "../types";

const startsWithVowel = (word: string): boolean => /^[aeiouAEIOU]/i.test(word.trim());
const articleFor = (word: string): string => (startsWithVowel(word) ? "an" : "a");
const formatTask = (task: string): string => {
  const firstWord = task.trim().split(" ")[0].toLowerCase();
  const skipPrefixes = ["i", "please", "we", "you", "they"];
  const startsWithSkip = skipPrefixes.includes(firstWord);
  if (startsWithSkip) {
    return `${task.trim()}\n\n`;
  }
  return `Your goal is to: \n${task.trim()}\n\n`;
};

const buildPrompt = (values: FormValues): string => {
  let finalPrompt: string = "";

  // Role
  if (values.role) {
    const article = articleFor(values.role.trim());
    finalPrompt += `You are ${article} ${values.role.trim()}\n\n`;
  }

  // Task
  if (values.task) {
    finalPrompt += formatTask(values.task);
  }

  // Reference
  if (values.reference) {
    finalPrompt += `Here's the input you'll work with: \n${values.reference.trim()}\n\n`;
  }

  // Format / Constraints
  if (values.format) {
    finalPrompt += `Follow these constraints:\n${values.format
      .split(",")
      .map((v) => `- ${v.trim().charAt(0).toUpperCase() + v.trim().slice(1)}`)
      .join("\n")}\n\n`;
  }

  // Tone
  if (values.tone && values.tone !== "None") {
    finalPrompt += `Answer with ${articleFor(values.tone.trim())} ${values.tone.toLowerCase()} tone.\n\n`;
  }

  // Audience
  if (values.audience) {
    finalPrompt += `Target audience: ${values.audience.trim()}\n\n`;
  }

  // Creativity
  if (values.creativity && values.creativity !== "None") {
    switch (values.creativity) {
      case "Low":
        finalPrompt += `Keep creativity low.\n\n`;
        break;
      case "Medium":
        finalPrompt += `Maintain a medium level of creativity.\n\n`;
        break;
      case "High":
        finalPrompt += `Be highly creative.\n\n`;
        break;
    }
  }

  // Example
  if (values.example) {
    finalPrompt += `Here's an example to guide your response: \n${values.example.trim()}\n\n`;
  }

  // Meta instructions
  if (values.meta) {
    finalPrompt += `${values.meta.trim()}\n\n`;
  }

  // Reasoning
  if (values.reasoning) {
    finalPrompt += `Explain your reasoning step-by-step but use natural language.\n\n`;
  }

  // Sources
  if (values.sources) {
    finalPrompt += `Include references or sources to support your statements.\n\n`;
  }

  // Summary
  if (values.summary) {
    finalPrompt += `Conclude with a short summary highlighting key points.\n\n`;
  }

  // Follow-up
  if (values.followup) {
    finalPrompt += `At the end, suggest one related topic I could explore next.\n\n`;
  }

  return finalPrompt.trim();
};

export default buildPrompt;
