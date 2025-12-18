import { Action, ActionPanel, List, Detail, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import exa from "./exa";
import type { SearchResult, ContentsOptions } from "exa-js";

export default function Ask() {
  const [query, setQuery] = useState("");
  const { push } = useNavigation();

  return (
    <List onSearchTextChange={setQuery} searchBarPlaceholder="Ask a question..." throttle>
      {query ? (
        <List.Item
          title={`Ask Exa: ${query}`}
          icon={Icon.QuestionMark}
          actions={
            <ActionPanel>
              <Action title="Ask" onAction={() => push(<AnswerResult query={query} />)} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView title="Type a question to ask Exa" icon={Icon.Message} />
      )}
    </List>
  );
}

function AnswerResult({ query }: { query: string }) {
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<SearchResult<ContentsOptions>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function stream() {
      setIsLoading(true);
      try {
        if (!isCancelled) {
          const result = await exa.answer(query);
          if (!isCancelled) {
            setAnswer(typeof result.answer === "string" ? result.answer : JSON.stringify(result.answer));
            setCitations(result.citations || []);
          }
        }
      } catch (error: unknown) {
        if (!isCancelled) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          showToast({ style: Toast.Style.Failure, title: "Failed to get answer", message: errorMessage });
          setAnswer((prev) => prev + "\n\n*Error generating answer.*");
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    stream();

    return () => {
      isCancelled = true;
    };
  }, [query]);

  const markdown = `
# Question
${query}

# Answer
${answer}

${citations.length > 0 ? `\n## Citations\n${citations.map((c, i) => `[${i + 1}] [${c.title || c.url}](${c.url})`).join("\n")}` : ""}
  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={answer} />
          <Action.CreateSnippet title="Save as Snippet" snippet={{ name: "Exa Answer", text: answer }} />
          {citations.map((c, i) => (
            <Action.OpenInBrowser key={i} title={`Open Citation ${i + 1}`} url={c.url} />
          ))}
        </ActionPanel>
      }
    />
  );
}
