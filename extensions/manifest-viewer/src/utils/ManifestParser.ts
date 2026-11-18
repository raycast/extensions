import { ManifestType } from "./types";

export interface ManifestVariant {
  uri: string;
  resolvedUri: string;
  bandwidth?: number;
  resolution?: string;
  codecs?: string;
  line: string;
}

export interface ManifestLink {
  uri: string;
  resolvedUri: string;
  type: "variant" | "segment" | "key" | "iframe" | "media" | "other";
  line: string;
  lineNumber: number;
}

export interface ParsedManifest {
  content: string;
  type: ManifestType;
  variants: ManifestVariant[];
  allLinks: ManifestLink[];
}

export class ManifestParser {
  private manifestContent: string;
  private manifestUrl: string;

  constructor(manifestContent: string, manifestUrl: string) {
    this.manifestContent = manifestContent;
    this.manifestUrl = manifestUrl;
  }

  getManifestType(): ManifestType {
    if (this.manifestContent.startsWith("#EXTM3U")) {
      return "hls";
    }
    if (this.manifestContent.startsWith("<?xml") || this.manifestContent.startsWith("<MPD")) {
      return "dash";
    }
    if (this.manifestContent.startsWith("WEBVTT") || this.manifestUrl.toLowerCase().includes(".vtt")) {
      return "webvtt";
    }
    return "unknown";
  }

  parse(): ParsedManifest {
    const type = this.getManifestType();
    const variants = this.extractVariants();
    const allLinks = this.extractAllLinks();

    return {
      content: this.manifestContent,
      type,
      variants,
      allLinks,
    };
  }

  private extractVariants(): ManifestVariant[] {
    const type = this.getManifestType();

    if (type === "hls") {
      return this.extractHLSVariants();
    }

    if (type === "dash") {
      return this.extractDashVariants();
    }

    return [];
  }

  private extractHLSVariants(): ManifestVariant[] {
    const lines = this.manifestContent.split("\n");
    const variants: ManifestVariant[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("#EXT-X-STREAM-INF:")) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !nextLine.startsWith("#")) {
          const variant = this.parseHLSStreamInf(line, nextLine);
          if (variant) {
            variants.push(variant);
          }
        }
      } else if (line && !line.startsWith("#") && line.includes(".m3u8")) {
        const variant: ManifestVariant = {
          uri: line,
          resolvedUri: this.resolveUri(line),
          line: line,
        };
        variants.push(variant);
      }
    }

    return variants;
  }

  private extractDashVariants(): ManifestVariant[] {
    const variants: ManifestVariant[] = [];

    const baseUrlMatches = this.manifestContent.match(/<BaseURL[^>]*>([^<]+)<\/BaseURL>/g);
    if (baseUrlMatches) {
      baseUrlMatches.forEach((match) => {
        const uri = match.replace(/<\/?BaseURL[^>]*>/g, "");
        variants.push({
          uri,
          resolvedUri: this.resolveUri(uri),
          line: match,
        });
      });
    }

    return variants;
  }

  private parseHLSStreamInf(streamInfLine: string, uriLine: string): ManifestVariant | null {
    const bandwidthMatch = streamInfLine.match(/BANDWIDTH=(\d+)/);
    const resolutionMatch = streamInfLine.match(/RESOLUTION=([^,]+)/);
    const codecsMatch = streamInfLine.match(/CODECS="([^"]+)"/);

    return {
      uri: uriLine,
      resolvedUri: this.resolveUri(uriLine),
      bandwidth: bandwidthMatch ? parseInt(bandwidthMatch[1]) : undefined,
      resolution: resolutionMatch ? resolutionMatch[1] : undefined,
      codecs: codecsMatch ? codecsMatch[1] : undefined,
      line: `${streamInfLine}\n${uriLine}`,
    };
  }

  private resolveUri(uri: string): string {
    if (this.isAbsolute(uri)) {
      return uri;
    }

    if (uri.startsWith("/")) {
      return this.getBaseUrl() + uri;
    }

    return this.getBasePath() + uri;
  }

  private isAbsolute(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  private getBaseUrl(): string {
    const match = this.manifestUrl.match(/^(https?:\/\/[^/]+)/);
    return match ? match[1] : "";
  }

  private getBasePath(): string {
    const match = this.manifestUrl.match(/^(.*\/)/);
    return match ? match[1] : "";
  }

  private extractAllLinks(): ManifestLink[] {
    const links: ManifestLink[] = [];
    const lines = this.manifestContent.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      // Skip empty lines and comments for URI extraction
      if (!line || line.startsWith("#")) {
        continue;
      }

      // Extract URIs from this line
      const uris = this.extractUrisFromLine(line);

      for (const uri of uris) {
        if (uri && !uri.startsWith("#")) {
          const type = this.determineUriType(line, uri);

          links.push({
            uri,
            resolvedUri: this.resolveUri(uri),
            type,
            line: line,
            lineNumber,
          });
        }
      }
    }

    return links;
  }

  private extractUrisFromLine(line: string): string[] {
    const uris: string[] = [];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return uris;
    }

    // Check for quoted URI patterns first (most common)
    const uriMatch = trimmedLine.match(/URI="([^"]+)"/);
    if (uriMatch) {
      uris.push(uriMatch[1]);
      return uris;
    }

    const srcMatch = trimmedLine.match(/src="([^"]+)"/);
    if (srcMatch) {
      uris.push(srcMatch[1]);
      return uris;
    }

    // Check for HTTP URLs
    const httpMatch = trimmedLine.match(/(https?:\/\/[^\s<>"]+)/);
    if (httpMatch) {
      uris.push(httpMatch[1]);
      return uris;
    }

    // Check for XML URL patterns (DASH)
    const xmlMatch = trimmedLine.match(/<[^>]*URL[^>]*>([^<]+)</);
    if (xmlMatch) {
      uris.push(xmlMatch[1]);
      return uris;
    }

    // For non-comment lines that might be relative paths, be more selective
    if (!trimmedLine.startsWith("#") && (trimmedLine.includes(".") || trimmedLine.includes("/"))) {
      // Only consider it a URI if it looks like a file or path
      if (trimmedLine.match(/\.(m3u8|ts|mp4|m4s|key|mpd|xml)$/i) || trimmedLine.includes("/")) {
        uris.push(trimmedLine);
      }
    }

    return uris;
  }

  private determineUriType(line: string, uri: string): ManifestLink["type"] {
    if (line.includes("#EXT-X-STREAM-INF") || uri.includes(".m3u8")) {
      return "variant";
    }
    if (line.includes("#EXT-X-KEY")) {
      return "key";
    }
    if (line.includes("#EXT-X-I-FRAME") || line.includes("I-FRAME")) {
      return "iframe";
    }
    if (line.includes("#EXT-X-MEDIA")) {
      return "media";
    }
    if (uri.includes(".ts") || uri.includes(".mp4") || uri.includes(".m4s")) {
      return "segment";
    }
    return "other";
  }
}
