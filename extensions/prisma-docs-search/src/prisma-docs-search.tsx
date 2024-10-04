import { useState, useEffect, useRef } from "react";
import {
  Detail,
  showToast,
  Toast,
  LaunchProps,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  openCommandPreferences,
  LocalStorage,
} from "@raycast/api";
import got from "got";
import { randomUUID } from "crypto";

interface Preferences {
  showMetadata: boolean;
}

interface RelevantSource {
  source_url: string;
  title: string;
}

export default function Command(
  props: LaunchProps<{ arguments: { query: string } }>,
) {
  const { query } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const [answer, setAnswer] = useState("");
  const [relevantSources, setRelevantSources] = useState<RelevantSource[]>([]);
  const [isAnswerUncertain, setIsAnswerUncertain] = useState();
  const [showMetadata, setShowMetadata] = useState(preferences.showMetadata);
  const [isLoading, setIsLoading] = useState(true);
  const [timeToAnswer, setTimeToAnswer] = useState<number>();
  const [questionAnswerId, setQuestionAnswerId] = useState<
    string | undefined
  >();
  const isMounted = useRef(false);

  function showError(error: Error) {
    setIsLoading(false);
    console.error("Streaming error:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Error fetching data",
      message: error.message,
    });
  }

  async function streamResponse() {
    console.log("Streaming Query:", query);

    const startTime = Date.now();
    try {
      const stream = await got.stream(
        `https://ask-ai-proxy.raycast-0ef.workers.dev/query/v1/projects/6af273b4-8b7b-4569-b76d-0ba12ccb88bc/chat/stream/`,
        {
          headers: {
            "X-UUID": await getUserId(),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            integration_id: "8daa37bb-c142-4fad-addc-cb189fb7c53d",
            query: query,
          }),
          method: "POST",
        },
      );

      let buffer = "";
      let answer = "";

      stream.on("data", (chunk) => {
        buffer += chunk.toString();
        const parts = buffer.split("␞");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (part.trim() !== "") {
            try {
              const data = JSON.parse(part);
              if (data.chunk.type === "partial_answer") {
                answer = answer + data.chunk.content.text;
                setAnswer(answer);
              } else if (data.chunk.type === "relevant_sources") {
                let uniqueRelevantSources: RelevantSource[] = Array.from(
                  new Map(
                    data.chunk.content.relevant_sources.map(
                      (item: RelevantSource) => [JSON.stringify(item), item],
                    ),
                  ).values(),
                ) as RelevantSource[];
                uniqueRelevantSources = uniqueRelevantSources
                  .filter(
                    (source: unknown) =>
                      (source as RelevantSource).source_url &&
                      (source as RelevantSource).source_url.length > 5,
                  )
                  .map((source: RelevantSource) => {
                    let titleParts = source.title.split("|");
                    titleParts = Array.from(
                      new Map(
                        titleParts.map((item: string) => [item, item]),
                      ).values(),
                    );
                    source.title = titleParts.join(" | ");
                    return source;
                  });
                setRelevantSources(uniqueRelevantSources as RelevantSource[]);
                uniqueRelevantSources.forEach((s) =>
                  console.log("Relevant source:", s),
                );
              } else if (data.chunk.type === "metadata") {
                setIsAnswerUncertain(data.chunk.content.is_uncertain);
              } else if (data.chunk.type === "identifiers") {
                setQuestionAnswerId(data.chunk.content.question_answer_id);
              } else {
                console.log("Unknown chunk:", data.chunk.type);
              }
            } catch (error) {
              showError(error as Error);
            }
          }
        }
      });

      stream.on("end", () => {
        setIsLoading(false);
        setTimeToAnswer(Date.now() - startTime);
      });

      stream.on("error", showError);
    } catch (error) {
      showError(error as Error);
    }
  }

  const getUserId = async () => {
    let userId = await LocalStorage.getItem<string>("user-id");
    if (!userId) {
      userId = randomUUID();
      await LocalStorage.setItem("user-id", userId);
    }
    return userId;
  };

  const submitFeedback = async (reaction: "upvote" | "downvote") => {
    const userId = await getUserId();

    try {
      await got.post(
        `https://ask-ai-proxy.raycast-0ef.workers.dev/query/v1/feedback/upsert/`,
        {
          headers: { "X-UUID": userId },
          json: {
            user_identifier: userId,
            reaction: reaction,
            question_answer: questionAnswerId,
          },
        },
      );

      showToast({
        title: reaction === "upvote" ? "Upvoted" : "Downvoted",
        message: "Thank you for your feedback!",
      });
    } catch (error) {
      showError(error as Error);
    }
  };

  useEffect(() => {
    if (!isMounted.current) {
      console.log("Component mounted for the first time");
      isMounted.current = true;
      streamResponse();
    }
  }, [query]);

  const toggleMetadataPanel = async () => {
    setShowMetadata(!showMetadata);
    await showToast({
      style: Toast.Style.Success,
      title: "Toggled the info panel",
      message: "Change default in preferences",
      primaryAction: {
        title: "Open preferences",
        shortcut: { modifiers: ["cmd"], key: "o" },
        onAction: (toast) => {
          openCommandPreferences();
          toast.hide();
        },
      },
    });
  };

  return (
    <Detail
      markdown={answer.length > 0 ? answer : "Searching for the best answer..."}
      isLoading={isLoading}
      navigationTitle={props.arguments.query}
      metadata={
        showMetadata && (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Time to Answer"
              text={timeToAnswer ? `${timeToAnswer / 1000}s` : "..."}
            />
            <Detail.Metadata.Label
              title="Character Count"
              text={`${answer.length} characters`}
            />
            <Detail.Metadata.Label
              title="Word Count"
              text={`${answer.split(/\s+/).filter((word) => word.length > 0).length} words`}
            />
            {isAnswerUncertain !== undefined && (
              <Detail.Metadata.TagList title="AI Answer Confidence">
                <Detail.Metadata.TagList.Item
                  text={isAnswerUncertain ? "Low" : "High"}
                  color={isAnswerUncertain ? "#eed535" : "#37a168"}
                />
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy answer" content={answer} />
          <ActionPanel.Submenu
            title="Sources considered for response"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "/" }}
          >
            {relevantSources.map((source) => (
              <Action.OpenInBrowser
                key={source.source_url}
                title={source.title}
                url={source.source_url}
              />
            ))}
          </ActionPanel.Submenu>
          <ActionPanel.Section>
            <Action
              title={(!showMetadata ? "Show" : "Hide") + " info panel"}
              icon={Icon.Info}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={toggleMetadataPanel}
            />
            <Action
              title="Open Preferences"
              onAction={openCommandPreferences}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              icon={Icon.Cog}
            />
          </ActionPanel.Section>

          {questionAnswerId && (
            <ActionPanel.Section title="Feedback">
              <Action
                title="Good answer"
                onAction={() => submitFeedback("upvote")}
                icon={Icon.ThumbsUp}
              />
              <Action
                title="Bad answer"
                onAction={() => submitFeedback("downvote")}
                icon={Icon.ThumbsDown}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
