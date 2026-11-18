export const AI_SERVICES = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    url: "https://chatgpt.com/",
  },
  {
    id: "claude",
    name: "Claude",
    url: "https://claude.ai/new",
  },
  {
    id: "grok",
    name: "Grok",
    url: "https://grok.com/",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    url: "https://www.perplexity.ai/search",
  },
] as const;

type AIService = (typeof AI_SERVICES)[number];
export type AIServiceId = AIService["id"];
export type ServiceCounts = Partial<Record<AIServiceId, number>>;

interface PromptUrlRequest {
  service: AIService;
  tabNumber: number;
  url: string;
}

interface OpenPromptUrlsResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

type PromptUrlOpener = (target: string, application?: string) => Promise<void>;

export function buildPromptUrl(service: AIService, prompt: string): string {
  const url = new URL(service.url);
  url.searchParams.set("q", prompt);
  return url.toString();
}

export function buildPromptUrlRequests(
  prompt: string,
  serviceCounts: ServiceCounts,
): PromptUrlRequest[] {
  const requests: PromptUrlRequest[] = [];

  for (const service of AI_SERVICES) {
    const count = serviceCounts[service.id] ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > 5) continue;

    for (let tabNumber = 1; tabNumber <= count; tabNumber++) {
      requests.push({
        service,
        tabNumber,
        url: buildPromptUrl(service, prompt),
      });
    }
  }

  return requests;
}

export async function openPromptUrlRequests(
  requests: PromptUrlRequest[],
  browserBundleId: string,
  openUrl: PromptUrlOpener,
): Promise<OpenPromptUrlsResult> {
  const errors: string[] = [];
  let succeeded = 0;

  for (const request of requests) {
    try {
      if (browserBundleId) {
        await openUrl(request.url, browserBundleId);
      } else {
        await openUrl(request.url);
      }
      succeeded++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(
        `${request.service.name} tab ${request.tabNumber}: ${message}`,
      );
    }
  }

  return {
    total: requests.length,
    succeeded,
    failed: requests.length - succeeded,
    errors,
  };
}
