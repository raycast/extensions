export type UrlFormat = "raw" | "markdown" | "bbcode";

/**
 * Join base URL and key, handling trailing/leading slashes
 */
export function joinUrl(base: string, key: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanKey = key.replace(/^\/+/, "");
  return `${cleanBase}/${cleanKey}`;
}

export type PublicUrlOptions = {
  useCustomPublicUrl: boolean;
  publicUrlBase?: string;
  s3Endpoint: string;
  s3Bucket: string;
  s3PathStyle: "path" | "virtual";
  key: string;
};

/**
 * Build public URL based on configuration.
 * If useCustomPublicUrl is true, use publicUrlBase + key.
 * Otherwise, build URL from S3 endpoint based on path style.
 */
export function buildPublicUrl(opts: PublicUrlOptions): string {
  if (opts.useCustomPublicUrl && opts.publicUrlBase) {
    return joinUrl(opts.publicUrlBase, opts.key);
  }

  // Build default S3 URL based on path style
  const cleanEndpoint = opts.s3Endpoint.replace(/\/+$/, "");
  const cleanKey = opts.key.replace(/^\/+/, "");

  if (opts.s3PathStyle === "virtual") {
    // Virtual-hosted style: https://bucket.endpoint/key
    const url = new URL(cleanEndpoint);
    url.hostname = `${opts.s3Bucket}.${url.hostname}`;
    return `${url.origin}/${cleanKey}`;
  } else {
    // Path style: https://endpoint/bucket/key
    return `${cleanEndpoint}/${opts.s3Bucket}/${cleanKey}`;
  }
}

/**
 * Format URL according to specified format
 */
export function formatUrl(url: string, format: UrlFormat): string {
  switch (format) {
    case "markdown":
      return `![](${url})`;
    case "bbcode":
      return `[img]${url}[/img]`;
    case "raw":
    default:
      return url;
  }
}
