import OpenAI from "openai/index.mjs";
import { ToneType, ProviderConfig, ProviderType } from "../types";
import { getPrefs } from "../utils";

// --- Provider Configuration ---

const PROVIDER_CONFIGS: Record<string, { baseUrl: string; model: string }> = {
  [ProviderType.OpenAI]: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  [ProviderType.Gemini]: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-2.0-flash",
  },
  [ProviderType.DeepSeek]: {
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
  },
  [ProviderType.Groq]: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
};

export function getProviderConfig(): ProviderConfig {
  const prefs = getPrefs();
  const provider = prefs.provider;

  if (provider === ProviderType.Custom) {
    return {
      baseUrl: prefs.customBaseUrl || "",
      model: prefs.customModel || "",
      apiKey: prefs.apiKey,
    };
  }

  const config =
    PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS[ProviderType.Gemini];
  return {
    baseUrl: config.baseUrl,
    model: config.model,
    apiKey: prefs.apiKey,
  };
}

// --- AI Module ---

export class AIModule {
  private openai: OpenAI;
  private model: string;

  constructor(config: ProviderConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model;
  }

  async fixGrammar(text: string): Promise<string> {
    const prompt = `Fix grammar and spelling mistakes in the following text. Do not rewrite it entirely, just fix errors. Return the result STRICTLY as a JSON object with three keys: 
1. "fixed": the fixed text.
2. "annotated_original": the exact original text, but with the mistakes highlighted using bold (**mistake**) or strikethrough (~~mistake~~).
3. "explanation": a concise bulleted list of grammar mistakes you found and fixed (in Vietnamese, or English if text is Vietnamese). If no errors were found, say "No errors found".

Do not include any markdown formatting or backticks outside the JSON. Text: "${text}"`;
    const response = await this.aiRequest(prompt);
    try {
      const start = response.indexOf("{");
      const end = response.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const jsonStr = response.slice(start, end + 1);
        const parsed = JSON.parse(jsonStr);
        return `${parsed.fixed}\n\n---ANNOTATED---\n\n${parsed.annotated_original || text}\n\n---EXPLANATION---\n\n${parsed.explanation}`;
      }
      return response;
    } catch {
      return response;
    }
  }

  private stripUnwantedQuotes(original: string, result: string): string {
    let finalResult = result.trim();
    const origTrimmed = original.trim();

    const originalHasQuotes =
      (origTrimmed.startsWith('"') && origTrimmed.endsWith('"')) ||
      (origTrimmed.startsWith("'") && origTrimmed.endsWith("'"));

    if (!originalHasQuotes) {
      if (
        (finalResult.startsWith('"') && finalResult.endsWith('"')) ||
        (finalResult.startsWith("'") && finalResult.endsWith("'"))
      ) {
        finalResult = finalResult.slice(1, -1).trim();
      }
    }
    return finalResult;
  }

  async paraphrase(text: string): Promise<string> {
    const prompt = `Paraphrase the following text to make it sound more natural and fluent, while STRICTLY preserving its exact original meaning and nuances. If the text is a single word and is already spelled correctly, DO NOT change it. Do not alter the core intent, and do not change specific idioms or fixed phrases unless absolutely necessary for naturalness. Only output the paraphrased text, nothing else. Do not wrap your output in quotes unless the original text has them. Text:\n${text}`;
    const result = await this.aiRequest(prompt);
    return this.stripUnwantedQuotes(text, result);
  }

  async changeTone(text: string, tone: ToneType): Promise<string> {
    const prompt = `Rewrite the following text in a ${tone.toLowerCase()} tone. Only output the rewritten text, nothing else. Do not wrap your output in quotes unless the original text has them. Text:\n${text}`;
    const result = await this.aiRequest(prompt);
    return this.stripUnwantedQuotes(text, result);
  }

  async continueText(text: string): Promise<string> {
    const prompt = `Continue the following text naturally for a few sentences. Only output the continuation, do not repeat the original text. Do not wrap your output in quotes unless the original text has them. Text:\n${text}`;
    const result = await this.aiRequest(prompt);
    return this.stripUnwantedQuotes(text, result);
  }

  async runCustomPrompt(text: string, userPrompt: string): Promise<string> {
    const prompt = `${userPrompt}\n\nText:\n${text}`;
    return await this.aiRequest(prompt);
  }

  async translate(text: string): Promise<string> {
    const prompt = `Translate the following text to Vietnamese if it's in English, or to English if it's in Vietnamese. Only output the translated text, nothing else. Do not wrap your output in quotes unless the original text has them. Text:\n${text}`;
    const result = await this.aiRequest(prompt);
    return this.stripUnwantedQuotes(text, result);
  }

  async refineAndTranslate(
    inputText: string,
  ): Promise<{ refined: string; translated: string }> {
    const prompt = `Please refine the following text. Then, translate it to Vietnamese if it's in English, or to English if it's in Vietnamese. Return the result STRICTLY as a JSON object with two keys: "refined" containing the refined original text, and "translated" containing the translated text. Do not include any markdown formatting, backticks, or other text outside the JSON object. Text to process: "${inputText}"`;
    const response = await this.aiRequest(prompt);
    try {
      const start = response.indexOf("{");
      const end = response.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const jsonStr = response.slice(start, end + 1);
        return JSON.parse(jsonStr);
      }
      throw new Error("No JSON found");
    } catch {
      // Fallback if the model fails to return JSON
      return {
        refined: "Failed to parse JSON. Raw response:\n" + response,
        translated: "",
      };
    }
  }

  async generateVocabInsight(
    term: string,
    definition: string,
  ): Promise<string> {
    const prompt = `Act as an expert English Teacher. The user is practicing the vocabulary flashcard:
Term: "${term}"
Definition: "${definition}"

Generate an insight or a mini-exercise for this word.
You MUST return ONLY a valid JSON object with no markdown wrapping. Do not include \`\`\`json or \`\`\`.

Choose randomly between two types: "reading" or "exercise".

If you choose "reading", provide ONE of the following (pick randomly):
- Cambridge Dictionary style definition: word type - pronunciation (IPA) - precise meaning - 1 clear example.
- Root word analysis. If the word does not have a clear root word, pick another option.
- Common collocations or language building blocks containing the word, with examples.
Return this JSON format:
{
  "type": "reading",
  "markdown": "Your engaging explanation here. Do NOT use numbered lists like 1) 2). Write beautifully in Vietnamese, except for the English examples. MUST use blank lines (\\n\\n) to separate sections, bullet points, and paragraphs for readability."
}

If you choose "exercise", provide a fill-in-the-blank sentence where the target word "${term}" is missing.
Return this JSON format:
{
  "type": "exercise",
  "question": "Sentence with a _____ where the word should be.",
  "answer": "${term}",
  "translation": "Vietnamese translation of the full sentence."
}`;
    return await this.aiRequest(prompt);
  }

  async defineWord(word: string): Promise<string> {
    const prompt = `Give a concise definition for the word or phrase: "${word}".
Return ONLY a valid JSON object in this format (no markdown code blocks):
{
  "definition": "Nghĩa tiếng Việt ngắn gọn nhất có thể. DO NOT put a period (.) at the end.",
  "example": "Loại từ: (noun/verb/...)\\nPhát âm: /IPA/\\nSắc thái nghĩa: (Giải thích ngắn gọn sắc thái, văn cảnh sử dụng, mức độ trang trọng)\\nVí dụ: English sentence.\\nDịch: Vietnamese translation."
}`;
    return await this.aiRequest(prompt);
  }

  async generateStory(
    words: { term: string; definition: string }[],
    topic: string,
  ): Promise<string> {
    const wordList = words
      .map((w) => `- ${w.term} (${w.definition})`)
      .join("\\n");
    const topicInstruction = topic
      ? `The theme/topic of the story MUST BE: "${topic}".`
      : "You can choose any engaging and informative topic.";

    const prompt = `You are an expert English teacher and creative writer.
I have a list of vocabulary words that I am learning:
${wordList}

Write a short, engaging reading passage (story or informative article) in English that naturally incorporates ALL the words listed above.
${topicInstruction}

Requirements:
1. The text should be approx 200-400 words.
2. Bold the target vocabulary words in the text using markdown (**word**).
3. Do NOT just list sentences; weave them into a coherent narrative or essay.
4. Return ONLY a valid JSON object in this format (no markdown code blocks like \`\`\`json):
{
  "english_text": "The full English reading passage.",
  "vietnamese_translation": "A high-quality Vietnamese translation of the entire passage to help the learner."
}`;
    return await this.aiRequest(prompt, 2); // 2 retries max for speed
  }

  async gradeAnswer(
    target: string,
    userAnswer: string,
  ): Promise<{ isCorrect: boolean; feedback: string }> {
    const prompt = `Act as a strict but fair English teacher grading a vocabulary flashcard quiz.
The correct target answer is: "${target}"
The student typed: "${userAnswer}"

Evaluate if the student's answer is semantically correct and demonstrates understanding of the target word/phrase. 
Rules:
1. Exact synonyms are correct (e.g. "huge" for "gigantic").
2. Slight grammatical variations are correct (e.g. "running" for "run").
3. Completely different meanings or opposite meanings are incorrect.
4. If it's correct but a different word, provide encouraging feedback.

Return ONLY a valid JSON object in this format (no markdown code blocks):
{
  "isCorrect": true/false,
  "feedback": "A very short explanation (max 1 sentence) of why it is correct or incorrect."
}`;
    const res = await this.aiRequest(prompt, 2);
    try {
      return JSON.parse(res.replace(/```json/g, "").replace(/```/g, ""));
    } catch {
      return { isCorrect: false, feedback: "AI grading failed to parse." };
    }
  }

  private async aiRequest(prompt: string, retries = 3): Promise<string> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "You are a professional writing assistant. You help fix grammar, paraphrase text, change tone, and continue writing. Always respond in the same language as the input text. Return only the result without any explanation or context.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        });

        return response.choices[0]?.message?.content?.trim() ?? "";
      } catch (error: unknown) {
        const statusCode = (error as { status?: number }).status;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Rate limit — retry with backoff
        if (statusCode === 429 && attempt < retries - 1) {
          const waitMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        // Specific error messages
        if (statusCode === 429) {
          throw new Error(
            "Rate limit exceeded. Please wait a moment and try again, or check your API quota.",
          );
        }
        if (statusCode === 401) {
          throw new Error(
            "Invalid API key. Please check your key in extension preferences.",
          );
        }
        if (statusCode === 403) {
          throw new Error(
            "Access denied. Your API key may not have permission for this model.",
          );
        }
        if (statusCode === 404) {
          throw new Error(
            `Model "${this.model}" not found. Check your provider/model settings.`,
          );
        }

        throw new Error(errorMessage || "Unknown API error occurred.");
      }
    }
    throw new Error("Failed after multiple retries.");
  }
}
