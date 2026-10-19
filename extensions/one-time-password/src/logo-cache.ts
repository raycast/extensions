import { Cache } from '@raycast/api';
import { useEffect, useState } from 'react';

// Grid tiles are drawn as one image, so logos are downloaded once and kept as data URIs on this Mac.
const cache = new Cache({ namespace: 'logos' });
const KEEP = 30 * 24 * 60 * 60 * 1000;
const RETRY = 24 * 60 * 60 * 1000;
const MAX_BYTES = 64 * 1024;

type Entry = { uri?: string; at: number };

function read(url: string): Entry | undefined {
  try {
    const raw = cache.get(url);
    return raw ? (JSON.parse(raw) as Entry) : undefined;
  } catch {
    return undefined;
  }
}

function fresh(entry: Entry | undefined): entry is Entry {
  return !!entry && Date.now() - entry.at < (entry.uri ? KEEP : RETRY);
}

async function download(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const type = response.headers.get('content-type')?.split(';')[0].trim() ?? '';
    if (!response.ok || !type.startsWith('image/')) return undefined;
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.length && bytes.length <= MAX_BYTES ? `data:${type};base64,${bytes.toString('base64')}` : undefined;
  } catch {
    return undefined;
  }
}

// Logo data URIs by logo URL. Missing entries mean "not loaded yet" or "no logo"; both show initials.
export function useLogos(urls: string[], enabled: boolean): Record<string, string> {
  const [logos, setLogos] = useState<Record<string, string>>({});
  const key = [...new Set(urls)].sort().join('\n');
  useEffect(() => {
    if (!enabled || !key) return;
    let cancelled = false;
    const wanted = key.split('\n');
    const known: Record<string, string> = {};
    const stale: string[] = [];
    for (const url of wanted) {
      const entry = read(url);
      if (entry?.uri) known[url] = entry.uri;
      if (!fresh(entry)) stale.push(url);
    }
    setLogos(known);
    void Promise.all(
      stale.map(async (url) => {
        const uri = await download(url);
        // A failed refresh keeps the old logo instead of dropping back to initials.
        cache.set(url, JSON.stringify({ uri: uri ?? read(url)?.uri, at: Date.now() }));
        if (uri && !cancelled) setLogos((current) => ({ ...current, [url]: uri }));
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);
  return logos;
}
