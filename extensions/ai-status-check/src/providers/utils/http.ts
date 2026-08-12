export type FetchJson = (url: string, signal: AbortSignal, init?: RequestInit) => Promise<unknown>;
export type FetchText = (url: string, signal: AbortSignal, init?: RequestInit) => Promise<string>;

export const fetchJson: FetchJson = async (url, signal, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...init.headers },
    signal,
  });

  if (!response.ok) throw new Error(`Status source returned HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
};

export const fetchText: FetchText = async (url, signal, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "text/html", ...init.headers },
    signal,
  });

  if (!response.ok) throw new Error(`Status source returned HTTP ${response.status}`);
  return response.text();
};
