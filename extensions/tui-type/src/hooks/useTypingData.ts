import { useState, useEffect } from "react";
import { Quote, Mode } from "../types";
import { typingService } from "../services/typingData";

export const useSupportedLanguages = () => {
  const [languages, setLanguages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);

    typingService
      .getLanguages()
      .then((data) => {
        setLanguages(data);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { languages, isLoading, error };
};

export const useTypingContent = (language: string, mode: Mode) => {
  const [content, setContent] = useState<string[] | Quote[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!language) return;

    setIsLoading(true);
    setContent(null);

    const fetcher =
      mode === "quote"
        ? typingService.getQuotes(language)
        : typingService.getWords(language);

    fetcher
      .then((data) => {
        setContent(data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [language, mode]);

  return { content, isLoading };
};

export const isQuoteContent = (
  content: string[] | Quote[] | null,
): content is Quote[] => {
  return (
    content !== null &&
    content !== undefined &&
    content.length > 0 &&
    typeof content[0] !== "string"
  );
};

export const isWordContent = (
  content: string[] | Quote[] | null,
): content is string[] => {
  return (
    content !== null &&
    content !== undefined &&
    content.length > 0 &&
    typeof content[0] === "string"
  );
};
