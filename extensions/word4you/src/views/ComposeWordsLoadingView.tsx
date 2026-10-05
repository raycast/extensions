import { Detail } from "@raycast/api";

interface ComposeWordsLoadingViewProps {
  currentWords: { word1: string; word2: string } | null;
}

export function ComposeWordsLoadingView({ currentWords }: ComposeWordsLoadingViewProps) {
  const loadingMsg = currentWords
    ? `# Composing ${currentWords.word1} + ${currentWords.word2}...`
    : "# Generating sentence...";

  return <Detail isLoading={true} markdown={loadingMsg} />;
}
