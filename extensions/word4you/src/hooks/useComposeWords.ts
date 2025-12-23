import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { executeWordCli } from "../services/cliManager";
import { MdDefinition } from "../types";

export interface ComposedSentence {
  english: string;
  chinese: string;
  word1: string;
  word2: string;
}

function parseComposedSentence(output: string, word1: string, word2: string): ComposedSentence | null {
  try {
    const lines = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    let english = "";
    let chinese = "";

    for (const line of lines) {
      // Skip the header line: ## word1 + word2
      if (line.startsWith("## ") && line.includes("+")) {
        continue;
      }
      // English sentence: - [SENTENCE] (first bullet without Chinese)
      if (line.startsWith("- ") && !english) {
        const text = line.replace(/^- /, "");
        // Check if it's English (no Chinese characters)
        if (!/[\u4e00-\u9fa5]/.test(text)) {
          english = text;
        }
      }
      // Chinese translation: - [中文翻译] (bullet with Chinese)
      else if (line.startsWith("- ") && english && !chinese) {
        const text = line.replace(/^- /, "");
        // Check if it contains Chinese characters
        if (/[\u4e00-\u9fa5]/.test(text)) {
          chinese = text;
        }
      }
    }

    if (english && chinese) {
      return { english, chinese, word1, word2 };
    }

    return null;
  } catch (error) {
    console.error("Error parsing composed sentence:", error);
    return null;
  }
}

function getRandomWords(words: string[], count: number): string[] {
  if (words.length < count) {
    return words;
  }

  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function useComposeWords(savedMdDefinitions: MdDefinition[], isLoadingSaved: boolean) {
  const [composedSentence, setComposedSentence] = useState<ComposedSentence | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWords, setCurrentWords] = useState<{ word1: string; word2: string } | null>(null);

  // Filter out composed sentences (those with " + " in the title)
  const singleWords = savedMdDefinitions.filter((def) => !def.text.includes(" + "));
  const singleWordsCount = singleWords.length;

  const generateSentence = useCallback(
    async (useExistingWords = false) => {
      if (singleWords.length < 2) {
        setError("You need at least 2 saved words to compose. Please save more words first.");
        return;
      }

      setIsGenerating(true);
      setError(null);
      setComposedSentence(null);

      try {
        let word1: string;
        let word2: string;

        if (useExistingWords && currentWords) {
          // Use the same words
          word1 = currentWords.word1;
          word2 = currentWords.word2;
        } else {
          // Get all saved word texts (excluding composed sentences)
          const allWords = singleWords.map((def) => def.text);
          // Pick 2 random words
          [word1, word2] = getRandomWords(allWords, 2);
          setCurrentWords({ word1, word2 });
        }

        await showToast({
          style: Toast.Style.Animated,
          title: "Generating sentence...",
          message: `Composing: ${word1} + ${word2}`,
        });

        // Call CLI to compose sentence
        const output = await executeWordCli(["compose", word1, word2]);

        const parsed = parseComposedSentence(output, word1, word2);

        if (parsed) {
          setComposedSentence(parsed);
          await showToast({
            style: Toast.Style.Success,
            title: "Sentence generated!",
          });
        } else {
          setError("Failed to parse the generated sentence. Please try again.");
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to parse sentence",
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to generate sentence",
          message: errorMessage,
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [singleWords, currentWords],
  );

  // Auto-generate on first load when words are available
  useEffect(() => {
    if (!isLoadingSaved && singleWordsCount >= 2 && !composedSentence && !isGenerating && !error) {
      generateSentence(false);
    }
  }, [isLoadingSaved, singleWordsCount, composedSentence, isGenerating, error, generateSentence]);

  return {
    composedSentence,
    isGenerating,
    error,
    currentWords,
    singleWordsCount,
    generateSentence,
  };
}
