import { ManifestLink } from "./ManifestParser";
import { ManifestLineItem, ManifestType } from "./types";

export function resolveManifestUri(uri: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(uri)) {
    return uri;
  }

  if (uri.startsWith("/")) {
    const match = baseUrl.match(/^(https?:\/\/[^/]+)/);
    return match ? match[1] + uri : uri;
  }

  const match = baseUrl.match(/^(.*\/)/);
  return match ? match[1] + uri : uri;
}

export function buildManifestLineItems(
  content: string,
  baseUrl: string,
  manifestType: ManifestType,
  links: ManifestLink[] = [],
): ManifestLineItem[] {
  if (manifestType === "hls") {
    const parsed = parseManifestLines(content, baseUrl);
    if (parsed.length) {
      return parsed;
    }
  }

  const linkByLineNumber = new Map<number, ManifestLink[]>();
  links.forEach((link) => {
    const items = linkByLineNumber.get(link.lineNumber) || [];
    items.push(link);
    linkByLineNumber.set(link.lineNumber, items);
  });

  const items: ManifestLineItem[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i].trim();

    if (!line) {
      continue;
    }

    const foundLinks = linkByLineNumber.get(lineNumber);
    if (foundLinks && foundLinks.length) {
      foundLinks.forEach((link) => {
        items.push({
          type: "uri",
          line: link.line || line,
          lineNumber,
          uri: link.uri,
          resolvedUri: link.resolvedUri,
          isInteractive: true,
          displayName: buildDisplayName(link),
        });
      });
      continue;
    }

    items.push({
      type: "tag",
      line,
      lineNumber,
      isInteractive: false,
    });
  }

  return items;
}

function buildDisplayName(link: ManifestLink): string | undefined {
  switch (link.type) {
    case "variant":
      return "Variant";
    case "segment":
      return "Segment";
    case "key":
      return "Key";
    case "iframe":
      return "I-Frame";
    case "media":
      return "Media";
    default:
      return undefined;
  }
}

export function parseManifestLines(content: string, baseUrl: string): ManifestLineItem[] {
  const lines = content.split("\n");
  const items: ManifestLineItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    if (!line) continue;

    if (line.startsWith("#EXTM3U") || line.startsWith("#EXT-X-VERSION")) {
      items.push({
        type: "header",
        line,
        lineNumber,
        isInteractive: false,
      });
    } else if (line.startsWith("#EXT-X-MEDIA:") && line.includes("URI=")) {
      const item = parseMediaTag(line, lineNumber, baseUrl);
      if (item) items.push(item);
    } else if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const item = parseStreamInfTag(lines, i, lineNumber, baseUrl);
      if (item) {
        items.push(item);
        i++; // Skip the next line since we processed it
      } else {
        items.push({
          type: "tag",
          line,
          lineNumber,
          isInteractive: false,
        });
      }
    } else if (line.startsWith("#EXTINF:")) {
      const item = parseExtinfTag(lines, i, lineNumber, baseUrl);
      if (item) {
        items.push(item);
        i++; // Skip the next line since we processed it
      } else {
        items.push({
          type: "tag",
          line,
          lineNumber,
          isInteractive: false,
        });
      }
    } else if (line.startsWith("#EXT-X-KEY:")) {
      const item = parseKeyTag(line, lineNumber, baseUrl);
      items.push(item);
    } else if (line.startsWith("#EXT-X-") || line.startsWith("#EXT-")) {
      const item = parseGenericTag(line, lineNumber, baseUrl);
      items.push(item);
    }
  }

  return items;
}

function parseMediaTag(line: string, lineNumber: number, baseUrl: string): ManifestLineItem | null {
  const uriMatch = line.match(/URI="([^"]+)"/);
  const typeMatch = line.match(/TYPE=([^,\s]+)/);
  const nameMatch = line.match(/NAME="([^"]+)"/);
  const languageMatch = line.match(/LANGUAGE="([^"]+)"/);

  if (uriMatch) {
    const uri = uriMatch[1];
    const mediaType = typeMatch ? typeMatch[1] : undefined;
    const mediaName = nameMatch ? nameMatch[1] : undefined;
    const language = languageMatch ? languageMatch[1] : undefined;

    let displayName = "";
    if (mediaType) {
      displayName = mediaType;
      if (mediaName) displayName += `: ${mediaName}`;
      if (language) displayName += ` (${language})`;
    }

    return {
      type: "tag",
      line,
      lineNumber,
      uri,
      resolvedUri: resolveManifestUri(uri, baseUrl),
      isInteractive: true,
      displayName: displayName || undefined,
      mediaType,
    };
  }
  return null;
}

function parseStreamInfTag(
  lines: string[],
  index: number,
  lineNumber: number,
  baseUrl: string,
): ManifestLineItem | null {
  const line = lines[index].trim();
  const nextLine = lines[index + 1]?.trim();

  if (nextLine && !nextLine.startsWith("#")) {
    const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
    const resolutionMatch = line.match(/RESOLUTION=([^,\s]+)/);

    const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1]) : undefined;
    const resolution = resolutionMatch ? resolutionMatch[1] : undefined;

    let displayName = "";
    if (resolution) {
      displayName = resolution;
      if (bandwidth) {
        const formattedBW =
          bandwidth >= 1000000 ? `${(bandwidth / 1000000).toFixed(1)}M` : `${Math.round(bandwidth / 1000)}K`;
        displayName += ` (${formattedBW}bps)`;
      }
    } else if (bandwidth) {
      const formattedBW =
        bandwidth >= 1000000 ? `${(bandwidth / 1000000).toFixed(1)}M` : `${Math.round(bandwidth / 1000)}K`;
      displayName = `${formattedBW}bps`;
    } else {
      displayName = "Video Variant";
    }

    return {
      type: "tag",
      line: `${line}|${nextLine}`,
      lineNumber,
      uri: nextLine,
      resolvedUri: resolveManifestUri(nextLine, baseUrl),
      isInteractive: true,
      displayName,
      mediaType: "VIDEO",
    };
  }
  return null;
}

function parseExtinfTag(lines: string[], index: number, lineNumber: number, baseUrl: string): ManifestLineItem | null {
  const line = lines[index].trim();
  const nextLine = lines[index + 1]?.trim();

  if (nextLine && !nextLine.startsWith("#")) {
    const durationMatch = line.match(/#EXTINF:([\d.]+)/);
    const duration = durationMatch ? parseFloat(durationMatch[1]) : undefined;

    let displayName = "";
    if (duration) {
      displayName = `Segment (${duration}s)`;
    } else {
      displayName = "Media Segment";
    }

    return {
      type: "tag",
      line: `${line}|${nextLine}`,
      lineNumber,
      uri: nextLine,
      resolvedUri: resolveManifestUri(nextLine, baseUrl),
      isInteractive: true,
      displayName,
      mediaType: "SEGMENT",
    };
  }
  return null;
}

function parseKeyTag(line: string, lineNumber: number, baseUrl: string): ManifestLineItem {
  const methodMatch = line.match(/METHOD=([^,\s]+)/);
  const uriMatch = line.match(/URI="([^"]+)"/);

  const method = methodMatch ? methodMatch[1] : undefined;
  let displayName = "";
  if (method) {
    displayName = `Encryption Key (${method})`;
  } else {
    displayName = "Encryption Key";
  }

  if (uriMatch) {
    return {
      type: "tag",
      line,
      lineNumber,
      uri: uriMatch[1],
      resolvedUri: resolveManifestUri(uriMatch[1], baseUrl),
      isInteractive: true,
      displayName,
      mediaType: "KEY",
    };
  } else {
    return {
      type: "tag",
      line,
      lineNumber,
      isInteractive: false,
      displayName,
    };
  }
}

function parseGenericTag(line: string, lineNumber: number, baseUrl: string): ManifestLineItem {
  const uriMatch = line.match(/URI="([^"]+)"/);
  if (uriMatch) {
    return {
      type: "tag",
      line,
      lineNumber,
      uri: uriMatch[1],
      resolvedUri: resolveManifestUri(uriMatch[1], baseUrl),
      isInteractive: true,
    };
  } else {
    return {
      type: "tag",
      line,
      lineNumber,
      isInteractive: false,
    };
  }
}
