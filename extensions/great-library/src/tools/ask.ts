import { askLibrary, CitationEntry } from "../lib/ask";
import { formatErrorMessage } from "../utils/ui-helpers";

type AskToolInput = {
  /**
   * The natural language question to answer using the indexed documents.
   */
  question: string;
};

type AskToolResult = {
  /**
   * Echo of the processed question for traceability.
   */
  question: string;
  /**
   * The model's response grounded in the Great Library.
   */
  answer: string;
  /**
   * Citations that support the answer, when available.
   */
  citations: CitationEntry[];
  /**
   * Success indicator
   */
  success: boolean;
  /**
   * Error message if failed
   */
  error?: string;
};

/**
 * Answer a question using the documents stored in the Great Library.
 * This is the AI tool interface for Raycast AI to interact with the library.
 */
export default async function askTool(input: AskToolInput): Promise<AskToolResult> {
  // Validate input
  const question = input?.question?.trim();
  if (!question) {
    return {
      question: "",
      answer: "",
      citations: [],
      success: false,
      error: "Provide a question to ask the Great Library.",
    };
  }

  try {
    console.log("[askTool] Processing question", { question });

    // Call the shared library function
    const { answer, citations } = await askLibrary({ question });

    console.log("[askTool] Answer received", {
      answerLength: answer?.length ?? 0,
      citationCount: citations.length,
    });

    return {
      question,
      answer: answer || "_The model returned no answer._",
      citations,
      success: true,
    };
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    console.error("[askTool] Failed to process question", error);

    return {
      question,
      answer: "",
      citations: [],
      success: false,
      error: errorMessage,
    };
  }
}
