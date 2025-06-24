import { useState, useEffect, useRef } from "react";
import { fuzzySearchFiles } from "../database";

interface SearchResult {
  title: string;
  subtitle: string;
  arg: string;
  uid: string;
  valid: boolean;
  mimeType?: string;
}

export function useSearch() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // JSON読み取り + fuse.jsで高速ファジー検索（同期処理）
      const searchResults = fuzzySearchFiles(query);
      setResults(searchResults);
    } catch (error) {
      console.error("検索エラー:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // デバウンス処理付きの検索実行
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      performSearch(searchText);
    }, 0); // 即座に検索（デバウンスなし）

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchText]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    searchText,
    setSearchText,
    results,
    isLoading,
    refreshSearch: () => performSearch(searchText),
  };
}
