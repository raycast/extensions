import {
  Action,
  ActionPanel,
  AI,
  Clipboard,
  Detail,
  getPreferenceValues,
  Icon,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { askTownspot } from "./lib/townspot";
import {
  buildTownspotAiPrompt,
  buildVerifiedEventsMarkdown,
  resolveActiveTown,
} from "./lib/townspot-ai";
import { RaycastResponse } from "./types";

const PROD_API_BASE_URL = "https://api.townspot.co/api";
const DEFAULT_LOCALE = "en-GB";

type CommandArguments = {
  prompt?: string;
};

type Preferences = {
  locale?: string;
};

const normalizeLocale = (locale: string | undefined): string => {
  const normalized = String(locale || DEFAULT_LOCALE).trim();
  return normalized || DEFAULT_LOCALE;
};

const normalizePrompt = (value: string | undefined): string =>
  String(value || "").trim();

const formatFallbackMarkdown = (prompt: string): string =>
  [
    "# Ask TownSpot AI",
    "",
    "Launch this command with a prompt argument.",
    "",
    "Examples:",
    "- `kids events this weekend`",
    "- `live music tonight`",
    "- `free events this week`",
    "",
    `Current prompt: ${prompt || "_empty_"}`,
  ].join("\n");

const buildResultMarkdown = (
  prompt: string,
  townName: string,
  aiAnswer: string,
  response: RaycastResponse | null,
  errorMessage: string,
): string => {
  if (!prompt) return formatFallbackMarkdown(prompt);

  const sections: string[] = [
    `# TownSpot AI · ${townName || "your town"}`,
    "",
    `**Query:** ${prompt}`,
  ];

  if (errorMessage) {
    sections.push("", `> ${errorMessage}`);
  } else {
    sections.push("", aiAnswer || "_Generating grounded answer..._");
  }

  if (response) {
    sections.push("", "## Verified Listings", "", buildVerifiedEventsMarkdown(response.events));
  }

  return sections.join("\n");
};

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const locale = normalizeLocale(preferences.locale);
  const prompt = useMemo(() => normalizePrompt(props.arguments.prompt), [props.arguments.prompt]);

  const [townName, setTownName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [response, setResponse] = useState<RaycastResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!prompt) {
        setTownName("");
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
        const town = await resolveActiveTown(PROD_API_BASE_URL);
        if (cancelled) return;
        setTownName(town.name);

        const groundedResponse = await askTownspot({
          query: prompt,
          townSlug: town.slug,
          locale,
          limit: 12,
          conversation: [],
          apiBaseUrl: PROD_API_BASE_URL,
        });
        if (cancelled) return;
        setResponse(groundedResponse);

        const aiPrompt = buildTownspotAiPrompt({
          query: prompt,
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
  }, [locale, prompt]);

  const markdown = useMemo(
    () => buildResultMarkdown(prompt, townName, aiAnswer, response, errorMessage),
    [aiAnswer, errorMessage, prompt, response, townName],
  );

  const firstEventUrl = response?.events?.[0]?.url;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
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
