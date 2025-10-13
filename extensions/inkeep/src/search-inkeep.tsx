import { Detail, Form, ActionPanel, Action, showToast, Toast, LaunchProps, Icon, Color } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { streamInkeepCompletion, InkeepLink, InkeepResponse, AIAnnotations } from "./services/inkeep";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchInkeep }>) {
  const { prompt: initialPrompt } = props.arguments;
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [response, setResponse] = useState<InkeepResponse | null>(null);
  const [streamedResponse, setStreamedResponse] = useState<string>("");
  const [showForm, setShowForm] = useState(!initialPrompt?.trim());
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [links, setLinks] = useState<InkeepLink[]>([]);
  const [aiAnnotations, setAIAnnotations] = useState<AIAnnotations | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uniqueLinks = useMemo(
    () => links.filter((link, index, self) => index === self.findIndex((l) => l.url === link.url)),
    [links],
  );

  // Process the initial prompt if provided as an argument
  useEffect(() => {
    if (initialPrompt?.trim()) {
      handlePromptSubmission(initialPrompt);
    }
  }, [initialPrompt]);

  async function handlePromptSubmission(prompt: string) {
    if (!prompt.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a prompt",
      });
      return;
    }

    setCurrentPrompt(prompt);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamedResponse("");
    setLinks([]);
    setAIAnnotations(null);
    setError(null);

    try {
      // Use streaming API
      await streamInkeepCompletion(
        prompt,
        (chunk) => {
          setStreamedResponse((prev) => prev + chunk);
        },
        (toolName, args) => {
          try {
            if (toolName === "provideLinks") {
              try {
                const toolData = JSON.parse(args);
                if (toolData.links) {
                  setLinks(toolData.links);
                }
              } catch (e) {
                console.error("Error parsing provideLinks tool call:", e);
              }
            } else if (toolName === "provideAIAnnotations") {
              try {
                const toolData = JSON.parse(args);

                if (toolData.aiAnnotations) {
                  setAIAnnotations(toolData.aiAnnotations);
                }
              } catch (e) {
                console.error("Error parsing provideAIAnnotations tool call:", e);
              }
            }
          } catch (error) {
            console.error("Error processing tool call:", error);
          }
        },
        (fullResponse) => {
          setResponse(fullResponse);
          setIsStreaming(false);
          if (fullResponse.links) {
            setLinks(fullResponse.links);
          }
          if (fullResponse.aiAnnotations) {
            setAIAnnotations(fullResponse.aiAnnotations);
          }
        },
      );
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
      // If there's an error and we came from an argument, show the form
      if (!showForm) {
        setShowForm(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(values: { prompt: string }) {
    await handlePromptSubmission(values.prompt);
  }

  // Get confidence level color
  function getConfidenceColor(confidence?: string | null): Color.ColorLike {
    if (!confidence) return Color.SecondaryText;

    switch (confidence) {
      case "very_confident":
        return Color.Green;
      case "somewhat_confident":
        return Color.Yellow;
      case "not_confident":
        return Color.Red;
      case "no_sources":
        return Color.Orange;
      case "unknown":
        return Color.SecondaryText;
      default:
        return Color.SecondaryText;
    }
  }

  // Render metadata for the Detail view
  function renderMetadata(prompt: string, showConfidence = false) {
    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Query" text={prompt} icon={Icon.MagnifyingGlass} />

        {showConfidence && aiAnnotations && (
          <>
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Confidence">
              {aiAnnotations.answerConfidence ? (
                <Detail.Metadata.TagList.Item
                  text={aiAnnotations.answerConfidence.replace(/_/g, " ")}
                  color={getConfidenceColor(aiAnnotations.answerConfidence)}
                  icon={Icon.LightBulb}
                />
              ) : (
                <Detail.Metadata.TagList.Item text="Unknown" color={Color.SecondaryText} icon={Icon.LightBulb} />
              )}
            </Detail.Metadata.TagList>
          </>
        )}

        {links.length > 0 && (
          <>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Sources"
              text={`${uniqueLinks.length} document${uniqueLinks.length === 1 ? "" : "s"}`}
              icon={Icon.Document}
            />

            {uniqueLinks.map((link, index) => (
              <Detail.Metadata.Link
                key={index}
                title={link.breadcrumbs?.join(" > ") || link.type || "Document"}
                text={link.title || link.label || "Link"}
                target={link.url}
              />
            ))}
          </>
        )}

        {error && (
          <>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Error" text={error} icon={Icon.ExclamationMark} />
          </>
        )}
      </Detail.Metadata>
    );
  }

  // Show streaming response if we're streaming
  if (isStreaming) {
    return (
      <Detail
        markdown={streamedResponse || "Loading response from Inkeep..."}
        metadata={renderMetadata(currentPrompt, false)}
        isLoading
        navigationTitle="Inkeep Response"
        actions={
          <ActionPanel>
            <Action
              title="Cancel"
              icon={Icon.XmarkCircle}
              onAction={() => {
                setIsStreaming(false);
                setShowForm(true);
              }}
            />
            {streamedResponse && (
              <Action.CopyToClipboard title="Copy Current Response" content={streamedResponse} icon={Icon.Clipboard} />
            )}
            {links.length > 0 && <Action.OpenInBrowser title="Open First Source" url={links[0].url} icon={Icon.Link} />}
          </ActionPanel>
        }
      />
    );
  }

  // Show final response if we have one
  if (response) {
    return (
      <Detail
        markdown={response.content}
        metadata={renderMetadata(currentPrompt, true)}
        navigationTitle="Inkeep Response"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Response" content={response.content} icon={Icon.Clipboard} />
            <Action
              title="Ask Another Question"
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => {
                setResponse(null);
                setStreamedResponse("");
                setLinks([]);
                setAIAnnotations(null);
                setError(null);
                setShowForm(true);
              }}
            />
            {links.length > 0 && <Action.OpenInBrowser title="Open First Source" url={links[0].url} icon={Icon.Link} />}
          </ActionPanel>
        }
      />
    );
  }

  // Show error state if there's an error but we have some response content
  if (error && streamedResponse) {
    return (
      <Detail
        markdown={streamedResponse + "\n\n---\n\n**Error:** " + error}
        metadata={renderMetadata(currentPrompt, true)}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Response" content={streamedResponse} icon={Icon.Clipboard} />
            <Action
              title="Try Again"
              icon={Icon.RotateClockwise}
              onAction={() => handlePromptSubmission(currentPrompt)}
            />
            <Action
              title="Ask Another Question"
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => {
                setResponse(null);
                setStreamedResponse("");
                setLinks([]);
                setAIAnnotations(null);
                setError(null);
                setShowForm(true);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Show loading state in Detail view if we're processing an argument
  if (isLoading && !showForm) {
    return (
      <Detail
        isLoading={true}
        markdown="Loading response from Inkeep..."
        metadata={renderMetadata(currentPrompt, false)}
      />
    );
  }

  // Show form as fallback or if user wants to ask another question
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Inkeep" icon={Icon.Message} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="What would you like to ask Inkeep?"
        enableMarkdown
        autoFocus
      />
    </Form>
  );
}
