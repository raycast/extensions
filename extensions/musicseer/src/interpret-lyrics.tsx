import { AI, Action, ActionPanel, Detail, Icon, LaunchType, launchCommand } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_INTERPRETATION_PROMPTS, InterpretationPrompt } from "./interpretation-prompts";

type InterpretationProps = {
  title?: string;
  artist?: string;
  lyrics?: string;
  sourceUrl?: string;
  promptId?: string;
};

function buildPrompt(input: { title?: string; artist?: string; lyrics: string; instruction: string }): string {
  return [
    "You are analyzing song lyrics for interpretation.",
    "",
    `Track: ${input.title || "Unknown"}`,
    `Artist: ${input.artist || "Unknown"}`,
    "",
    "Instructions:",
    input.instruction,
    "",
    "Output requirements:",
    "- Use markdown with short sections.",
    "- Ground claims in the provided lyrics only.",
    "- Use short quotes as evidence where useful.",
    "- If a part is ambiguous, state that explicitly.",
    "",
    "Lyrics:",
    input.lyrics,
  ].join("\n");
}

export default function InterpretLyricsView({
  title: songTitle,
  artist: songArtist,
  lyrics: songLyrics,
  sourceUrl,
  promptId,
}: InterpretationProps) {
  const { value: storedPrompts, isLoading: isPromptsLoading } = useLocalStorage<InterpretationPrompt[]>(
    "interpretation-prompts",
    DEFAULT_INTERPRETATION_PROMPTS,
  );
  const { value: defaultPromptId, isLoading: isDefaultPromptLoading } = useLocalStorage<string>(
    "default-interpretation-prompt-id",
    DEFAULT_INTERPRETATION_PROMPTS[0].id,
  );

  const prompts = useMemo(() => {
    if (storedPrompts && storedPrompts.length > 0) {
      return storedPrompts;
    }

    return DEFAULT_INTERPRETATION_PROMPTS;
  }, [storedPrompts]);

  const [selectedPromptId, setSelectedPromptId] = useState(
    promptId || defaultPromptId || DEFAULT_INTERPRETATION_PROMPTS[0].id,
  );
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (promptId) {
      return;
    }

    if (
      !selectedPromptId &&
      defaultPromptId &&
      defaultPromptId !== selectedPromptId &&
      prompts.some((prompt) => prompt.id === defaultPromptId)
    ) {
      setSelectedPromptId(defaultPromptId);
    }
  }, [defaultPromptId, promptId, prompts, selectedPromptId]);

  useEffect(() => {
    if (!prompts.some((prompt) => prompt.id === selectedPromptId)) {
      setSelectedPromptId(prompts[0]?.id || "");
    }
  }, [prompts, selectedPromptId]);

  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedPromptId) || prompts[0],
    [prompts, selectedPromptId],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const lyrics = songLyrics?.trim();
      if (!lyrics) {
        setError("No lyrics were provided to interpret.");
        setIsLoading(false);
        setMarkdown("No lyrics were provided to interpret.");
        return;
      }

      if (!selectedPrompt?.instruction?.trim()) {
        setError("Selected prompt is empty.");
        setIsLoading(false);
        setMarkdown("The selected prompt is empty. Open Manage Prompts to fix it.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setMarkdown("");

      try {
        const stream = AI.ask(
          buildPrompt({
            title: songTitle,
            artist: songArtist,
            lyrics,
            instruction: selectedPrompt.instruction,
          }),
          { creativity: "medium" },
        );

        stream.on("data", (chunk) => {
          if (!cancelled) {
            setMarkdown((prev) => prev + chunk);
          }
        });

        await stream;
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : String(e);
          setError(message);
          setMarkdown(`Interpretation failed.\n\n\`${message}\``);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (!isPromptsLoading && !isDefaultPromptLoading) {
      void run();
    }

    return () => {
      cancelled = true;
    };
  }, [isDefaultPromptLoading, isPromptsLoading, selectedPrompt, songArtist, songLyrics, songTitle]);

  const navTitle = songTitle ? `Interpretation: ${songTitle}` : "Lyrics Interpretation";

  return (
    <Detail
      isLoading={isLoading || isPromptsLoading || isDefaultPromptLoading}
      navigationTitle={navTitle}
      markdown={markdown || "Generating interpretation..."}
      metadata={
        <Detail.Metadata>
          {songTitle && (
            <>
              <Detail.Metadata.Label title="Track" text={songTitle} />
              <Detail.Metadata.Separator />
            </>
          )}
          {songArtist && (
            <>
              <Detail.Metadata.Label title="Artist" text={songArtist} />
              <Detail.Metadata.Separator />
            </>
          )}
          <Detail.Metadata.Label title="Prompt" text={selectedPrompt?.title || "None"} />
          {error && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Error" icon={Icon.XMarkCircle} text={error} />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Manage Prompts"
            icon={Icon.Gear}
            onAction={async () => {
              await launchCommand({
                name: "manage-prompts",
                type: LaunchType.UserInitiated,
              });
            }}
          />
          {prompts.filter((prompt) => prompt.id !== selectedPromptId).length > 0 && (
            <ActionPanel.Section title="Other Prompts">
              {prompts
                .filter((prompt) => prompt.id !== selectedPromptId)
                .map((prompt) => (
                  <Action
                    key={prompt.id}
                    title={prompt.title}
                    icon={Icon.Stars}
                    onAction={() => setSelectedPromptId(prompt.id)}
                  />
                ))}
            </ActionPanel.Section>
          )}
          <Action.CopyToClipboard title="Copy Interpretation" content={markdown} />
          {sourceUrl && <Action.OpenInBrowser title="Open Track on Genius.com" url={sourceUrl} />}
        </ActionPanel>
      }
    />
  );
}
