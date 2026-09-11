export interface WordReferenceErrorResponse {
  type: "error";
  status: number;
  statusText: string;
}

export const wordReferenceRequestHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.wordreference.com/",
};

export function getErrorMarkdown(status: number, statusText: string): string {
  return `# ${getTranslationErrorTitle(status)}

${getStatusExplanation(status, "translation")}

You can still open the result in your browser to continue.

## Probable causes

${getProbableCauses(status)}

## What you can try

- Open the result in your browser
- Disable VPN or proxy temporarily
- Try again from another network later

## Technical details

HTTP ${status} ${statusText}`;
}

export function getSearchErrorDescription(status: number, statusText: string): string {
  return `${getStatusSummary(status)} Press Enter to see more. HTTP ${status} ${statusText}`;
}

export function getSearchErrorMarkdown(status: number, statusText: string, word: string): string {
  return `# ${getSearchErrorTitle(status)}

${getStatusExplanation(status, "search")}

You can still open the result page for **${word}** in your browser to continue.

## Probable causes

${getProbableCauses(status)}

## What you can try

- Open the result in your browser
- Disable VPN or proxy temporarily
- Try again from another network later

## Technical details

HTTP ${status} ${statusText}`;
}

export function getWordReferenceUrl(baseUrl: string, word: string): string {
  return `https://www.wordreference.com/${baseUrl}/${encodeURIComponent(word)}`;
}

function getSearchErrorTitle(status: number): string {
  if (status === 404) {
    return "Search page not found";
  }

  return "Search unavailable";
}

function getTranslationErrorTitle(status: number): string {
  if (status === 404) {
    return "Translation page not found";
  }

  return "Translation unavailable";
}

function getStatusSummary(status: number): string {
  if (status === 404) {
    return "WordReference could not find the requested page.";
  }
  if (status === 429) {
    return "WordReference rate-limited the request.";
  }
  if (status === 403 || status === 418) {
    return "WordReference rejected the request.";
  }
  if (status >= 500) {
    return "WordReference returned a server error.";
  }

  return "WordReference returned an unexpected error.";
}

function getStatusExplanation(status: number, target: "search" | "translation"): string {
  if (status === 404) {
    return `WordReference could not find the ${target} page. The page may not exist, or WordReference may have changed its URL format.`;
  }
  if (status === 429) {
    return `WordReference rate-limited the ${target} request before it could be loaded.`;
  }
  if (status === 403 || status === 418) {
    return `WordReference rejected the ${target} request before it could be loaded.`;
  }
  if (status >= 500) {
    return `WordReference returned a server error before the ${target} page could be loaded.`;
  }

  return `WordReference returned an unexpected HTTP error before the ${target} page could be loaded.`;
}

function getProbableCauses(status: number): string {
  if (status === 404) {
    return `- The word or dictionary page does not exist
- WordReference changed its URL format
- The selected dictionary pair is no longer available`;
  }
  if (status === 429) {
    return `- Temporary rate limit from WordReference
- Too many requests in a short time
- Shared network or VPN traffic triggering limits`;
  }
  if (status === 403 || status === 418) {
    return `- Bot protection triggered by the request
- VPN, proxy, or corporate network filtering
- IP address or network reputation block
- Temporary rate limit from WordReference`;
  }
  if (status >= 500) {
    return `- Temporary WordReference service issue
- Regional WordReference outage
- Upstream server or CDN problem`;
  }

  return `- WordReference changed its request requirements
- WordReference changed its URL format
- Temporary service or network issue`;
}
