import { showHUD, getPreferenceValues, Clipboard } from "@raycast/api";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { cleanText, getLLMModel, getSelectedText, replaceSelectedText } from "./utils/common";

const execAsync = promisify(exec);
const SOX_PATH = "/opt/homebrew/bin/sox";

interface Preferences {
  openaiApiKey: string;
  primaryLang: string;
  fixText: boolean;
}

/**
 * Clean up old recording files (older than 1 hour)
 * @param tempDir Directory containing the recordings
 */
async function cleanupOldRecordings(tempDir: string) {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < oneHourAgo && file.startsWith("recording-") && file.endsWith(".wav")) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old recording: ${file}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning up old recordings:", error);
  }
}

/**
 * Execute the prompt using OpenAI
 * @param prompt The prompt to execute
 * @param selectedText Optional selected text to include in the prompt
 * @param openai OpenAI instance
 * @returns Promise<string> The generated text
 */
async function executePrompt(prompt: string, selectedText: string | null, openai: OpenAI): Promise<string> {
  console.log("Executing prompt with:", { prompt, hasSelectedText: !!selectedText });

  const systemPrompt = selectedText
    ? "You are an AI assistant that helps users modify text based on voice commands. Apply the user's prompt to modify the text. Respond ONLY with the modified text, without any explanations or context."
    : "You are an AI assistant that helps users generate text based on voice commands. Respond ONLY with the generated text, without any explanations or context.";

  const userPrompt = selectedText
    ? `Please modify the following text according to this instruction: "${prompt}"\n\nText to modify: "${selectedText}"`
    : prompt;

  console.log("Sending to OpenAI:", {
    model: getLLMModel(),
    systemPrompt,
    userPrompt,
  });

  const completion = await openai.chat.completions.create({
    model: getLLMModel(),
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.7,
  });

  const result = completion.choices[0].message.content?.trim() || "";
  console.log("OpenAI response:", { length: result.length, preview: result.substring(0, 100) });

  return result;
}

/**
 * Clean and process the transcribed prompt to extract the actual command
 * @param transcription The raw transcription from Whisper
 * @returns The cleaned prompt or null if it's just a request for text
 */
async function cleanPrompt(transcription: string): Promise<string | null> {
  console.log("Starting prompt cleaning for:", transcription);

  // Remove common politeness formulas and meta-responses
  const cleanedText = transcription
    .replace(
      /^(bien sûr|d'accord|je serais ravi|avec plaisir|je peux|je vais|pouvez-vous|pourriez-vous|s'il vous plaît|veuillez),?\s*/i,
      "",
    )
    .replace(/^(je serais ravi de vous aider|je peux vous aider|je vais vous aider).*$/i, "")
    .replace(/veuillez (me )?(fournir|donner) le texte.*$/i, "")
    .replace(/^(il faut|on va|on peut|je vais) /i, "")
    .trim();

  console.log("After removing politeness:", cleanedText);

  // If it's a direct command starting with a verb, keep it as is
  if (/^(rends?|fais|mets?|écris|transforme|améliore|modifie|change)/i.test(cleanedText)) {
    console.log("Direct command detected, keeping as is");
    return cleanedText;
  }

  // If the cleaned text is empty or just asking for input, return null
  if (
    !cleanedText ||
    /^(fournir|donner|montrer|partager) le texte/i.test(cleanedText) ||
    /reformuler votre texte/i.test(cleanedText) ||
    /^voici|^c'est/i.test(cleanedText)
  ) {
    console.log("Invalid command detected");
    return null;
  }

  console.log("Final cleaned prompt:", cleanedText);
  return cleanedText;
}

export default async function Command() {
  console.log("Starting dictate-prompt command...");

  try {
    const preferences = getPreferenceValues<Preferences>();

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: preferences.openaiApiKey,
    });

    // Vérifier que sox est installé
    if (!fs.existsSync(SOX_PATH)) {
      console.error(`Sox not found at path: ${SOX_PATH}`);
      await showHUD("🎙️ Sox not found - Please install it with: brew install sox");
      return;
    }

    // Get selected text if any
    let selectedText: string | null = null;
    try {
      selectedText = await getSelectedText();
      console.log("Found selected text:", selectedText);
    } catch (error) {
      console.log("No text selected, will generate new text");
    }

    // Préparer le fichier temporaire
    const tempDir = path.join(process.env.TMPDIR || "/tmp", "raycast-dictate");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Clean up old recordings
    await cleanupOldRecordings(tempDir);

    const outputPath = path.join(tempDir, `recording-${Date.now()}.wav`);
    console.log("Recording will be saved to:", outputPath);

    // Démarrer l'enregistrement
    await showHUD("🎙️ Recording... (will stop after 2s of silence)");
    console.log("Starting recording...");

    const command = `
      export PATH="/opt/homebrew/bin:$PATH";
      "${SOX_PATH}" -d "${outputPath}" silence 1 0.1 2% 1 2.0 2%
    `;

    await execAsync(command, { shell: "/bin/zsh" });
    console.log("Recording completed");

    // Traiter l'audio
    await showHUD("🔄 Converting speech to text...");
    console.log("Processing audio file:", outputPath);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(outputPath),
      model: "whisper-1",
    });

    console.log("Raw transcription:", transcription.text);

    // Clean up the transcription if needed
    let prompt = transcription.text;
    if (preferences.fixText) {
      await showHUD("✍️ Improving prompt...");
      prompt = await cleanText(prompt, openai);
      console.log("Cleaned transcription:", prompt);
    }

    // Clean the prompt
    console.log("Cleaning prompt...");
    const cleanedPrompt = await cleanPrompt(prompt);
    console.log("Cleaned prompt result:", cleanedPrompt);

    if (!cleanedPrompt) {
      console.log("Invalid prompt detected:", prompt);
      await showHUD("❌ Please specify what you want to do with the text");
      return;
    }

    // Nettoyer le fichier temporaire
    fs.unlinkSync(outputPath);
    console.log("Temporary file cleaned up");

    // Execute the prompt
    await showHUD("🤖 Processing your request...");
    console.log("Executing prompt:", cleanedPrompt);

    const generatedText = await executePrompt(cleanedPrompt, selectedText, openai);

    // Replace selected text or paste at cursor position
    if (selectedText) {
      await replaceSelectedText(generatedText);
      await showHUD("✅ Text replaced!");
    } else {
      await Clipboard.paste(generatedText);
      await showHUD("✅ Text generated and pasted!");
    }

    console.log("Operation completed successfully");
  } catch (error) {
    console.error("Error:", error);
    await showHUD("❌ Error: " + (error instanceof Error ? error.message : "An error occurred"));
  } finally {
    // Nettoyage final
    try {
      await execAsync("pkill sox");
    } catch (error) {
      // Ignore pkill errors
    }
  }
}
