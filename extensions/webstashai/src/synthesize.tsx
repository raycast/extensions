import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import {
  getLastQuota,
  getStats,
  handleApiError,
  synthesize,
} from "./api/client";
import { isValidApiKey } from "./helpers/utils";
import type { QuotaInfo, SynthesizeResponse } from "./types";

export default function SynthesizeCommand() {
  const apiKey = getPreferenceValues<Preferences>().apiKey;
  if (!isValidApiKey(apiKey)) {
    return (
      <Detail markdown="## Invalid API Key\n\nYour API key must start with `wsk_`. Open extension preferences to update it." />
    );
  }

  return <SynthesizeForm />;
}

function SynthesizeForm() {
  const { push } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queryError, setQueryError] = useState<string | undefined>();
  const [quota, setQuota] = useState<QuotaInfo | null>(getLastQuota());

  // Fetch fresh quota on mount (a lightweight GET /stats call populates headers)
  useEffect(() => {
    getStats()
      .then(() => setQuota(getLastQuota()))
      .catch(() => {
        // Non-critical — we'll show whatever we have
      });
  }, []);

  const handleSubmit = useCallback(
    async (values: { query: string }) => {
      const query = values.query.trim();
      if (!query) {
        setQueryError("Query is required");
        return;
      }

      setIsSubmitting(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Synthesizing...",
        message: "This may take a few seconds",
      });

      try {
        const result = await synthesize(query);
        toast.hide();
        push(<SynthesizeResultView query={query} result={result} />);
      } catch (error) {
        toast.hide();
        const handled = await handleApiError(error);
        if (!handled) await showFailureToast("Synthesis failed");
      } finally {
        setIsSubmitting(false);
      }
    },
    [push],
  );

  const quotaLabel = buildQuotaLabel(quota);

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Synthesize"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Synthesize"
            icon={Icon.Stars}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="query"
        title="Topic"
        placeholder="e.g., web performance, machine learning"
        error={queryError}
        onChange={() => setQueryError(undefined)}
      />
      {quotaLabel && <Form.Description title="AI Quota" text={quotaLabel} />}
      <Form.Description
        title=""
        text="Generates a structured briefing across your saved pages. Uses 1 AI query credit."
      />
    </Form>
  );
}

function buildQuotaLabel(quota: QuotaInfo | null): string | null {
  if (!quota) return null;
  if (quota.ai_limit) {
    return `${quota.ai_used} / ${quota.ai_limit} queries used`;
  }
  return `${quota.ai_used} queries used`;
}

// ── Result view ────────────────────────────────────────────────

function SynthesizeResultView({
  query,
  result,
}: {
  query: string;
  result: SynthesizeResponse;
}) {
  const markdown = buildResultMarkdown(query, result);

  return (
    <Detail
      navigationTitle={`Synthesis: ${query}`}
      markdown={markdown}
      metadata={
        result.sources.length > 0 ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Sources"
              text={`${result.sources.length} pages cited`}
              icon={Icon.Book}
            />
            <Detail.Metadata.Separator />
            {result.sources.map((source) => (
              <Detail.Metadata.Link
                key={source.id}
                title={source.title}
                text={new URL(source.url).hostname}
                target={source.url}
              />
            ))}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Synthesis"
            content={result.synthesis}
          />
          <Action.Paste title="Paste Synthesis" content={result.synthesis} />
          {result.sources.length > 0 && (
            <Action.CopyToClipboard
              title="Copy with Sources"
              content={buildCopyWithSources(result)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function buildResultMarkdown(
  query: string,
  result: SynthesizeResponse,
): string {
  const lines: string[] = [`# ${query}\n`, result.synthesis];

  if (result.sources.length > 0) {
    lines.push("\n---\n**Sources:**\n");
    for (const source of result.sources) {
      lines.push(`- [${source.title}](${source.url})`);
    }
  }

  return lines.join("\n");
}

function buildCopyWithSources(result: SynthesizeResponse): string {
  const lines = [result.synthesis, "", "Sources:"];
  for (const source of result.sources) {
    lines.push(`- ${source.title}: ${source.url}`);
  }
  return lines.join("\n");
}
