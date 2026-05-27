export type ServiceStatus = "up" | "down" | "degraded" | "unknown" | "error";

export type ServiceId = "downforeveryoneorjustme" | "isitdownrightnow";

export interface WebsiteTarget {
  domain: string;
  input: string;
}

export interface ServiceResult {
  id: ServiceId;
  serviceName: string;
  status: ServiceStatus;
  summary: string;
  sourceUrl: string;
  details: string[];
  checkedAt: Date;
}

const REQUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

const FETCH_TIMEOUT_MS = 15_000;

export function normalizeWebsiteInput(input: string): WebsiteTarget {
  const trimmed = input.trim().replace(/^<|>$/g, "");

  if (!trimmed) {
    throw new Error("Please enter a website URL.");
  }

  if (/\s/.test(trimmed)) {
    throw new Error("Website URLs cannot contain spaces.");
  }

  const urlText = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const parsed = new URL(urlText);
  const domain = parsed.hostname.toLowerCase();

  if (!domain || domain === "localhost" || !domain.includes(".")) {
    throw new Error(
      "Please enter a public website domain, for example example.com.",
    );
  }

  return {
    domain,
    input: trimmed,
  };
}

export function getDownForEveryoneUrl(domain: string) {
  return `https://downforeveryoneorjustme.com/${encodeURIComponent(domain)}`;
}

export function getIsItDownRightNowUrl(domain: string) {
  return `https://www.isitdownrightnow.com/${encodeURIComponent(domain)}.html`;
}

export async function checkWebsite(
  target: WebsiteTarget,
): Promise<ServiceResult[]> {
  return Promise.all([
    checkDownForEveryoneOrJustMe(target.domain),
    checkIsItDownRightNow(target.domain),
  ]);
}

export function getOverallStatus(results: ServiceResult[]): ServiceStatus {
  if (results.some((result) => result.status === "down")) {
    return "down";
  }

  if (results.some((result) => result.status === "degraded")) {
    return "degraded";
  }

  if (results.every((result) => result.status === "up")) {
    return "up";
  }

  if (results.every((result) => result.status === "error")) {
    return "error";
  }

  return "unknown";
}

async function checkDownForEveryoneOrJustMe(
  domain: string,
): Promise<ServiceResult> {
  const sourceUrl = getDownForEveryoneUrl(domain);

  try {
    const direct = await fetchText(sourceUrl);
    const directResult = parseDownForEveryoneOrJustMe(
      domain,
      direct.text,
      direct.finalUrl || sourceUrl,
    );

    if (directResult.status !== "unknown") {
      return directResult;
    }

    const reader = await fetchText(toReadablePageUrl(sourceUrl));
    return parseDownForEveryoneOrJustMe(domain, reader.text, sourceUrl);
  } catch (error) {
    return toErrorResult(
      "downforeveryoneorjustme",
      "Down for Everyone or Just Me",
      sourceUrl,
      error,
    );
  }
}

async function checkIsItDownRightNow(domain: string): Promise<ServiceResult> {
  const sourceUrl = getIsItDownRightNowUrl(domain);
  const apiUrl = `https://www.isitdownrightnow.com/check.php?domain=${encodeURIComponent(domain)}`;

  try {
    const response = await fetchText(apiUrl);
    return parseIsItDownRightNow(domain, response.text, sourceUrl);
  } catch (error) {
    return toErrorResult(
      "isitdownrightnow",
      "Is It Down Right Now",
      sourceUrl,
      error,
    );
  }
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    const text = await response.text();

    if (!response.ok && !isCloudflareChallenge(text)) {
      throw new Error(`Request failed with HTTP ${response.status}`);
    }

    return {
      finalUrl: response.url,
      text,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseDownForEveryoneOrJustMe(
  domain: string,
  body: string,
  sourceUrl: string,
): ServiceResult {
  const text = normalizeText(body);
  const lineText = normalizeLines(body);
  const details: string[] = [];
  const lastUpdated = findFirst(lineText, /^Last updated:\s*(.+)$/im);
  const lastOutage = findFirst(
    text,
    /(The last outage detected for .*? with a duration of .*?\.)/i,
  );
  const commonProblem = findFirst(
    text,
    /(The most common problem reported about .*? was:\s*[^.]+\.?)/i,
  );

  if (lastUpdated) {
    details.push(`Last updated: ${lastUpdated}`);
  }

  if (lastOutage) {
    details.push(lastOutage);
  }

  if (commonProblem) {
    details.push(commonProblem);
  }

  if (isCloudflareChallenge(body)) {
    return {
      id: "downforeveryoneorjustme",
      serviceName: "Down for Everyone or Just Me",
      status: "unknown",
      summary:
        "The service returned a browser challenge instead of a status page.",
      sourceUrl,
      details: [
        "The extension will retry through a readable copy of the same public status page.",
      ],
      checkedAt: new Date(),
    };
  }

  if (/It's just you\..*?is up\./i.test(text)) {
    return {
      id: "downforeveryoneorjustme",
      serviceName: "Down for Everyone or Just Me",
      status: "up",
      summary: `${domain} is up. Down for Everyone or Just Me says the issue is likely local.`,
      sourceUrl,
      details,
      checkedAt: new Date(),
    };
  }

  if (
    /No,\s*we are not detecting any problems with .*? right now\./i.test(text)
  ) {
    const summary =
      findFirst(
        text,
        /(No,\s*we are not detecting any problems with .*? right now\.)/i,
      ) ?? `${domain} is up according to Down for Everyone or Just Me.`;

    return {
      id: "downforeveryoneorjustme",
      serviceName: "Down for Everyone or Just Me",
      status: "up",
      summary,
      sourceUrl,
      details,
      checkedAt: new Date(),
    };
  }

  if (/It's not just you!.*?is down\./i.test(text)) {
    return {
      id: "downforeveryoneorjustme",
      serviceName: "Down for Everyone or Just Me",
      status: "down",
      summary: `${domain} is down for everyone according to Down for Everyone or Just Me.`,
      sourceUrl,
      details,
      checkedAt: new Date(),
    };
  }

  if (
    /A problem with .*? has been detected based on user reports/i.test(text)
  ) {
    return {
      id: "downforeveryoneorjustme",
      serviceName: "Down for Everyone or Just Me",
      status: "degraded",
      summary: "A problem has been detected based on user reports.",
      sourceUrl,
      details,
      checkedAt: new Date(),
    };
  }

  if (/Checking server\. This will only take a few seconds/i.test(text)) {
    details.push(
      "The status page is still generating a result. Try refreshing in a few seconds.",
    );
  }

  return {
    id: "downforeveryoneorjustme",
    serviceName: "Down for Everyone or Just Me",
    status: "unknown",
    summary: "Could not read a current status from the public status page.",
    sourceUrl,
    details,
    checkedAt: new Date(),
  };
}

function parseIsItDownRightNow(
  domain: string,
  body: string,
  sourceUrl: string,
): ServiceResult {
  const websiteName = extractField(body, "Website Name");
  const checkedUrl = extractField(body, "URL Checked");
  const responseTime = extractField(body, "Response Time");
  const lastDown = extractField(body, "Last Down");
  const downFor = extractField(body, "Down For");
  const statusText = extractStatusText(body);
  const badgeText = extractStatusBadge(body);
  const details = [
    checkedUrl ? `URL checked: ${checkedUrl}` : undefined,
    responseTime ? `Response time: ${responseTime}` : undefined,
    lastDown ? `Last down: ${lastDown}` : undefined,
    downFor ? `Down for: ${downFor}` : undefined,
  ].filter(Boolean) as string[];

  if (body.includes('class="upicon"')) {
    return {
      id: "isitdownrightnow",
      serviceName: "Is It Down Right Now",
      status: "up",
      summary: statusText || `${websiteName || domain} is up and reachable.`,
      sourceUrl,
      details,
      checkedAt: new Date(),
    };
  }

  if (body.includes('class="downicon"')) {
    const status: ServiceStatus =
      badgeText && badgeText.toLowerCase() !== "down" ? "degraded" : "down";

    return {
      id: "isitdownrightnow",
      serviceName: "Is It Down Right Now",
      status,
      summary: statusText || `${websiteName || domain} is not reachable.`,
      sourceUrl,
      details,
      checkedAt: new Date(),
    };
  }

  return {
    id: "isitdownrightnow",
    serviceName: "Is It Down Right Now",
    status: "unknown",
    summary: "Could not read a current status from check.php.",
    sourceUrl,
    details,
    checkedAt: new Date(),
  };
}

function toErrorResult(
  id: ServiceId,
  serviceName: string,
  sourceUrl: string,
  error: unknown,
): ServiceResult {
  return {
    id,
    serviceName,
    status: "error",
    summary:
      error instanceof Error
        ? error.message
        : "Unexpected error while checking the service.",
    sourceUrl,
    details: [],
    checkedAt: new Date(),
  };
}

function extractField(html: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labelPattern = new RegExp(`<b>${escapedLabel}:?</b>`, "i");
  const rows =
    html.match(/<div class="tabletr(?:simple)?"[\s\S]*?<\/div>/gi) ?? [];
  const row = rows.find((candidate) => labelPattern.test(candidate));
  const match = row?.match(/<span class="tab">([\s\S]*?)<\/span>/i);

  return match ? normalizeText(match[1]) : undefined;
}

function extractStatusText(html: string) {
  const match = html.match(/<div class="status(?:up|down)">([\s\S]*?)<\/div>/i);
  return match ? normalizeText(match[1]) : undefined;
}

function extractStatusBadge(html: string) {
  const match = html.match(
    /<span class="(?:upicon|downicon)">([\s\S]*?)<\/span>/i,
  );
  return match ? normalizeText(match[1]) : undefined;
}

function normalizeText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLines(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function findFirst(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[1]?.trim();
}

function isCloudflareChallenge(body: string) {
  return /cf-mitigated|Just a moment|Enable JavaScript and cookies to continue/i.test(
    body,
  );
}

function toReadablePageUrl(url: string) {
  return `https://r.jina.ai/http://r.jina.ai/http://${url}`;
}
