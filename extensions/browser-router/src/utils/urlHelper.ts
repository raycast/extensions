export function isLikelyUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  // Browser internal schemas
  if (/^(chrome|edge|brave|vivaldi|arc|file):\/\//i.test(trimmed) || /^about:/i.test(trimmed)) {
    return true;
  }

  // Explicit web protocols (must have a host following the protocol)
  if (/^https?:\/\/[^\s/]+/i.test(trimmed) || /^ftp:\/\/[^\s/]+/i.test(trimmed)) {
    return true;
  }

  // Windows absolute file path (supports spaces, e.g. C:\Users\... or C:\Program Files\...)
  if (/^[a-zA-Z]:[/\\]/i.test(trimmed)) {
    return true;
  }

  // Localhost with optional port / path
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return true;
  }

  // IPv6 localhost with optional port / path (e.g. [::1], [::1]:3000, ::1, ::1:8080)
  if (/^(\[::1\]|::1)(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return true;
  }

  // IPv4 address with optional port / path
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed)) {
    return true;
  }

  // Domain name without spaces (e.g. github.com, sub.domain.co.uk/docs)
  if (!/\s/.test(trimmed)) {
    const domainPattern = /^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)*\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
    if (domainPattern.test(trimmed)) {
      return true;
    }
  }

  return false;
}

export function buildTargetUrl(input: string, searchEngine: string = "google", customUrl?: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (isLikelyUrl(trimmed)) {
    // Already has supported protocol
    if (/^(https?|ftp|file|chrome|edge|brave|vivaldi|arc):\/\/|^about:/i.test(trimmed)) {
      return trimmed;
    }
    // Windows local drive path -> file:/// URL (encodes spaces safely)
    if (/^[a-zA-Z]:[/\\]/i.test(trimmed)) {
      const normalized = trimmed.replace(/\\/g, "/");
      return encodeURI(`file:///${normalized}`);
    }
    // IPv6 localhost -> http://[::1]
    if (/^(\[::1\]|::1)/i.test(trimmed)) {
      if (trimmed.startsWith("::1")) {
        const rest = trimmed.slice(3);
        return `http://[::1]${rest}`;
      }
      return `http://${trimmed}`;
    }
    // Localhost or IPv4 -> http://
    if (/^localhost/i.test(trimmed) || /^(\d{1,3}\.){3}\d{1,3}/.test(trimmed)) {
      return `http://${trimmed}`;
    }
    // Standard domain -> https://
    return `https://${trimmed}`;
  }

  const query = encodeURIComponent(trimmed);
  switch (searchEngine) {
    case "duckduckgo":
      return `https://duckduckgo.com/?q=${query}`;
    case "bing":
      return `https://www.bing.com/search?q=${query}`;
    case "brave":
      return `https://search.brave.com/search?q=${query}`;
    case "perplexity":
      return `https://www.perplexity.ai/search?q=${query}`;
    case "ecosia":
      return `https://www.ecosia.org/search?q=${query}`;
    case "custom":
      if (customUrl && customUrl.trim()) {
        const trimmedCustom = customUrl.trim();
        if (/%s/i.test(trimmedCustom)) {
          return trimmedCustom.replace(/%s/gi, query);
        }
        // Fallback if user omitted %s
        if (trimmedCustom.endsWith("=") || trimmedCustom.endsWith("/")) {
          return `${trimmedCustom}${query}`;
        }
        return `${trimmedCustom}?q=${query}`;
      }
      return `https://www.google.com/search?q=${query}`;
    case "google":
    default:
      return `https://www.google.com/search?q=${query}`;
  }
}
