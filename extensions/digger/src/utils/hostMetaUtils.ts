import { HostMetadataData } from "../types";
import { TIMEOUTS } from "./config";
import { fetchWithTimeout } from "./fetcher";
import { getLogger } from "./logger";

const log = getLogger("hostmeta");

interface JRDLink {
  rel: string;
  href?: string;
  template?: string;
  type?: string;
  title?: string;
}

interface JRD {
  properties?: Record<string, string>;
  links?: JRDLink[];
}

export async function fetchHostMetadata(baseUrl: string): Promise<HostMetadataData | undefined> {
  try {
    const url = new URL("/.well-known/host-meta", baseUrl);
    log.log("fetch:start", { url: url.href });

    const { response, status } = await fetchWithTimeout(url.href, TIMEOUTS.HOST_META);

    // 404/410 mean the host genuinely publishes no host-meta — a normal answer,
    // not a failure. Any other non-200 (5xx, 403, a redirect loop) is an
    // operational failure and must NOT be flattened into the same "unavailable"
    // the UI shows for absence.
    if (status === 404 || status === 410) {
      log.log("fetch:not-found", { status });
      return { available: false };
    }
    if (status !== 200) {
      throw new Error(`host-meta request failed with HTTP ${status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (contentType.includes("application/json") || contentType.includes("application/jrd+json")) {
      log.log("parse:jrd");
      return parseJRD(text);
    } else {
      log.log("parse:xrd");
      return parseXRD(text);
    }
  } catch (error) {
    // Rethrow. The caller wraps this in withAbort(..., undefined), which restores
    // that exact fallback — so behaviour is unchanged for callers, but the reason
    // survives instead of masquerading as "no host-meta published".
    log.error("fetch:error", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

function parseJRD(text: string): HostMetadataData {
  try {
    const jrd: JRD = JSON.parse(text);

    const result: HostMetadataData = {
      available: true,
      format: "jrd",
    };

    if (jrd.properties && Object.keys(jrd.properties).length > 0) {
      result.properties = jrd.properties;
    }

    if (jrd.links && jrd.links.length > 0) {
      result.links = jrd.links.map((link) => ({
        rel: link.rel,
        href: link.href,
        template: link.template,
        type: link.type,
        title: link.title,
      }));
    }

    log.log("parse:jrd:success", {
      properties: Object.keys(result.properties || {}).length,
      links: result.links?.length || 0,
    });

    return result;
  } catch (error) {
    // The server returned a document and we could not read it. That is a failure,
    // not absence — flattening it to `available: false` is how a malformed
    // host-meta became indistinguishable from a host that publishes none.
    log.error("parse:jrd:error", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

function parseXRD(text: string): HostMetadataData {
  try {
    const result: HostMetadataData = {
      available: true,
      format: "xrd",
    };

    const propertyRegex = /<Property[^>]*type=["']([^"']+)["'][^>]*>([^<]*)<\/Property>/gi;
    const properties: Record<string, string> = {};
    let match;

    while ((match = propertyRegex.exec(text)) !== null) {
      const type = match[1];
      const value = match[2];
      if (type && value) {
        properties[type] = value;
      }
    }

    if (Object.keys(properties).length > 0) {
      result.properties = properties;
    }

    const linkRegex = /<Link([^>]*)\/?>(?:<\/Link>)?/gi;
    const links: Array<{
      rel: string;
      href?: string;
      template?: string;
      type?: string;
      title?: string;
    }> = [];

    while ((match = linkRegex.exec(text)) !== null) {
      const linkAttrs = match[1];
      const relMatch = linkAttrs.match(/rel=["']([^"']+)["']/);
      const hrefMatch = linkAttrs.match(/href=["']([^"']+)["']/);
      const templateMatch = linkAttrs.match(/template=["']([^"']+)["']/);
      const typeMatch = linkAttrs.match(/type=["']([^"']+)["']/);
      const titleMatch = linkAttrs.match(/title=["']([^"']+)["']/);

      if (relMatch) {
        links.push({
          rel: relMatch[1],
          href: hrefMatch?.[1],
          template: templateMatch?.[1],
          type: typeMatch?.[1],
          title: titleMatch?.[1],
        });
      }
    }

    if (links.length > 0) {
      result.links = links;
    }

    log.log("parse:xrd:success", {
      properties: Object.keys(result.properties || {}).length,
      links: result.links?.length || 0,
    });

    return result;
  } catch (error) {
    // The server returned a document and we could not read it. That is a failure,
    // not absence — flattening it to `available: false` is how a malformed
    // host-meta became indistinguishable from a host that publishes none.
    log.error("parse:xrd:error", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
