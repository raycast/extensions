import {
  Action,
  ActionPanel,
  AI,
  Clipboard,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { askTownspot } from "./lib/townspot";
import {
  buildTownspotAiPrompt,
  buildVerifiedEventsMarkdown,
  resolveTownForPrompt,
} from "./lib/townspot-ai";
import { RaycastResponse } from "./types";

const PROD_API_BASE_URL = "https://api.townspot.co/api";
const DEFAULT_LOCALE = "en-GB";

type Preferences = {
  locale?: string;
};

type AskTownspotAiFormValues = {
  prompt: string;
};

const normalizeLocale = (locale: string | undefined): string => {
  const normalized = String(locale || DEFAULT_LOCALE).trim();
  return normalized || DEFAULT_LOCALE;
};

const normalizePrompt = (value: string | undefined): string =>
  String(value || "").trim();

const buildResultMarkdown = (
  prompt: string,
  townName: string,
  aiAnswer: string,
  errorMessage: string,
): string => {
  const sections: string[] = [
    `# TownSpot AI · ${townName || "your town"}`,
    "",
    `**Query:** ${prompt}`,
  ];

  if (errorMessage) {
    sections.push("", `> ${errorMessage}`);
  } else {
    sections.push("", aiAnswer || "_Generating grounded answer…_");
  }

  return sections.join("\n");
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const locale = normalizeLocale(preferences.locale);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");

  const [townName, setTownName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [response, setResponse] = useState<RaycastResponse | null>(null);
  const [townSource, setTownSource] = useState<"home" | "query">("home");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!submittedPrompt) {
        setTownName("");
        setTownSource("home");
        setErrorMessage("");
        setAiAnswer("");
        setResponse(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");
      setAiAnswer("");
      setResponse(null);

      try {
        const resolvedTown = await resolveTownForPrompt(PROD_API_BASE_URL, submittedPrompt);
        const town = resolvedTown.town;
        if (cancelled) return;
        setTownName(town.name);
        setTownSource(resolvedTown.source);

        const groundedResponse = await askTownspot({
          query: submittedPrompt,
          townSlug: town.slug,
          locale,
          limit: 12,
          conversation: [],
          apiBaseUrl: PROD_API_BASE_URL,
        });
        if (cancelled) return;
        setResponse(groundedResponse);

        const aiPrompt = buildTownspotAiPrompt({
          query: submittedPrompt,
          townName: town.name,
          apiAnswer: groundedResponse.answer,
          events: groundedResponse.events,
        });

        const stream = AI.ask(aiPrompt, { creativity: "low" });
        stream.on("data", (chunk) => {
          if (cancelled) return;
          setAiAnswer((current) => current + chunk);
        });
        await stream;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not run Ask TownSpot AI.";
        if (!cancelled) {
          setErrorMessage(message);
          await showToast({
            style: Toast.Style.Failure,
            title: "Ask TownSpot AI failed",
            message,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [locale, submittedPrompt]);

  const markdown = useMemo(
    () => buildResultMarkdown(submittedPrompt, townName, aiAnswer, errorMessage),
    [aiAnswer, errorMessage, submittedPrompt, townName],
  );

  const subtitle =
    townName && townSource === "query"
      ? `Matched town from query: ${townName}`
      : townName
        ? `Using hometown: ${townName}`
        : "Ask TownSpot AI";

  const firstEventUrl = response?.events?.[0]?.url;

  if (!submittedPrompt) {
    return (
      <Form
        navigationTitle="Ask TownSpot AI"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Ask TownSpot AI"
              onSubmit={async (values: AskTownspotAiFormValues) => {
                const normalized = normalizePrompt(values.prompt);
                if (!normalized) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Enter a question",
                    message: "Try: kids events this weekend",
                  });
                  return;
                }
                setSubmittedPrompt(normalized);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description text="Ask naturally. TownSpot AI will answer using TownSpot event listings." />
        <Form.TextArea
          id="prompt"
          title="Question"
          placeholder="kids events this weekend"
          value={draftPrompt}
          onChange={setDraftPrompt}
        />
      </Form>
    );
  }

  return (
    <Detail
      navigationTitle={subtitle}
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Ask Another Question"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => {
              setDraftPrompt(submittedPrompt);
              setSubmittedPrompt("");
            }}
          />
          {firstEventUrl ? <Action.OpenInBrowser title="Open First Listing" url={firstEventUrl} /> : null}
          {aiAnswer ? <Action.CopyToClipboard title="Copy AI Answer" content={aiAnswer} /> : null}
          {response?.events?.length ? (
            <Action
              title="Copy Verified Listings"
              icon={Icon.Clipboard}
              onAction={async () => {
                const listings = buildVerifiedEventsMarkdown(response.events);
                await Clipboard.copy(listings);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied verified listings",
                });
              }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
