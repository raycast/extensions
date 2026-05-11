import { AI, Action, ActionPanel, Detail, Icon, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";

const API_URL = "https://wpbones.com/api/search?q=";

interface Document {
  title: string;
  content: string;
  items: Array<{ title: string; url: string; excerpt: string }>;
}

const SYSTEM_PROMPT = `You are a WP Bones framework expert. WP Bones is a lightweight framework for WordPress plugin development inspired by Laravel.
Answer the user's question based on the documentation context provided.
Be concise and practical. Include code examples when relevant.
If you reference a documentation page, format it as a markdown link.
If the context doesn't contain enough information to answer, say so and suggest what to search for.`;

export default function Command(props: LaunchProps<{ arguments: { question: string } }>) {
  const question = props.arguments.question;
  const [answer, setAnswer] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const isAskingRef = useRef(false);
  const mountedRef = useRef(true);

  const searchQuery = question.split(" ").slice(0, 3).join(" ");
  const { data: docs, isLoading: isLoadingDocs } = useFetch<Document[]>(
    `${API_URL}${encodeURIComponent(searchQuery)}`,
    { keepPreviousData: false },
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!docs || isAskingRef.current) return;
    isAskingRef.current = true;
    setIsAsking(true);

    const context = Array.isArray(docs)
      ? docs
          .flatMap((d) => d.items.map((item) => `## ${item.title}\n${item.excerpt}\nURL: ${item.url}`))
          .slice(0, 5)
          .join("\n\n---\n\n")
      : "No documentation context available.";

    const prompt = `${SYSTEM_PROMPT}\n\n## Documentation Context\n\n${context}\n\n## User Question\n\n${question}`;

    setAnswer("");

    const stream = AI.ask(prompt, {
      creativity: "low",
      model: AI.Model.Anthropic_Claude_Sonnet,
    });

    stream.on("data", (chunk) => {
      if (mountedRef.current) setAnswer((prev) => prev + chunk);
    });

    stream
      .then(() => {
        isAskingRef.current = false;
        if (mountedRef.current) setIsAsking(false);
      })
      .catch(() => {
        isAskingRef.current = false;
        if (mountedRef.current) {
          setIsAsking(false);
          setAnswer("Failed to get AI response. Please try again.");
        }
      });
  }, [docs, question]);

  return (
    <Detail
      isLoading={isLoadingDocs || isAsking}
      markdown={answer || `#### Searching documentation for: "${question}"...`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={answer} />
          <Action.OpenInBrowser
            title="Search Online"
            icon={Icon.Globe}
            url={`https://wpbones.com/docs?q=${encodeURIComponent(question)}`}
          />
        </ActionPanel>
      }
    />
  );
}
