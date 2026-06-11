import { Action, ActionPanel, Color, Detail, Icon, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getBrandIdentityGenerationStatus, getPostGenerationStatus } from "../lib/notra";
import { notraUrl } from "../utils";
import type { GenerationEvent, GenerationJobStatus } from "../types";
import { BrandIdentityDetail } from "./brand-identity-detail";

interface PostGenerationStatusProps {
  jobId: string;
  onComplete?: () => void;
  type: "post";
}

interface BrandIdentityGenerationStatusProps {
  jobId: string;
  onComplete?: () => void;
  type: "brand-identity";
}

type GenerationStatusProps = PostGenerationStatusProps | BrandIdentityGenerationStatusProps;

const STATUS_ICONS: Record<GenerationJobStatus, { icon: Icon; color: Color }> = {
  queued: { icon: Icon.Clock, color: Color.SecondaryText },
  running: { icon: Icon.CircleProgress50, color: Color.Blue },
  completed: { icon: Icon.CheckCircle, color: Color.Green },
  failed: { icon: Icon.XMarkCircle, color: Color.Red },
};

const EVENT_ICONS: Record<string, string> = {
  failed: "x",
  completed: "v",
};

function formatEventType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchPostStatus(jobId: string) {
  const result = await getPostGenerationStatus(jobId);
  return {
    status: result.job.status,
    events: result.events,
    error: result.job.error,
    resultId: result.job.postId,
  };
}

async function fetchBrandIdentityStatus(jobId: string) {
  const result = await getBrandIdentityGenerationStatus(jobId);
  return {
    status: result.job.status,
    events: [] as GenerationEvent[],
    error: result.job.error,
    resultId: result.job.brandIdentityId,
  };
}

function isTerminal(s: GenerationJobStatus) {
  return s === "completed" || s === "failed";
}

export function GenerationStatus({ type, jobId, onComplete }: GenerationStatusProps) {
  const { push } = useNavigation();
  const [status, setStatus] = useState<GenerationJobStatus>("queued");
  const [events, setEvents] = useState<GenerationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const calledComplete = useRef(false);
  const didNavigate = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetcher = type === "post" ? fetchPostStatus : fetchBrandIdentityStatus;

    async function poll() {
      try {
        const result = await fetcher(jobId);
        if (cancelled) {
          return;
        }

        setStatus(result.status);
        setEvents(result.events);
        setError(result.error);
        setResultId(result.resultId);

        if (isTerminal(result.status)) {
          setIsLoading(false);
          if (result.status === "completed" && !calledComplete.current) {
            calledComplete.current = true;
            onComplete?.();
          }
          return;
        }
        timeoutId = setTimeout(poll, 2000);
      } catch {
        if (cancelled) {
          return;
        }
        setIsLoading(false);
        setStatus("failed");
        setError("Failed to fetch generation status");
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [jobId, type, onComplete]);

  useEffect(() => {
    if (type === "brand-identity" && status === "completed" && resultId && !didNavigate.current) {
      didNavigate.current = true;
      push(<BrandIdentityDetail brandIdentityId={resultId} />);
    }
  }, [type, status, resultId, push]);

  const statusInfo = STATUS_ICONS[status];
  const title = type === "post" ? "Post Generation" : "Brand Identity Generation";

  let markdown = `# ${title}\n\n`;

  if (status === "queued") {
    markdown += "Waiting in queue...\n";
  } else if (status === "running") {
    markdown += "Generating...\n";
  } else if (status === "completed") {
    markdown += "Generation completed successfully.\n";
  } else if (status === "failed") {
    markdown += `Generation failed${error ? `: ${error}` : "."}\n`;
  }

  if (events.length > 0) {
    markdown += "\n---\n\n### Steps\n\n";
    for (const event of events) {
      const icon = EVENT_ICONS[event.type] ?? "·";
      markdown += `${icon} **${formatEventType(event.type)}** — ${event.message}\n\n`;
    }
  }

  return (
    <Detail
      actions={
        <ActionPanel>
          {status === "completed" && resultId && type === "post" && (
            <Action.OpenInBrowser icon={Icon.Globe} title="View on Notra" url={notraUrl(`/content/${resultId}`)} />
          )}
          {status === "completed" && type === "brand-identity" && (
            <Action.OpenInBrowser icon={Icon.Globe} title="View on Notra" url={notraUrl("/settings/brand")} />
          )}
          <Action.CopyToClipboard content={jobId} title="Copy Job ID" />
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              color={statusInfo.color}
              icon={statusInfo.icon}
              text={status.charAt(0).toUpperCase() + status.slice(1)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label text={jobId} title="Job ID" />
        </Detail.Metadata>
      }
    />
  );
}
