export function directionUrl(from: string, to: string): string {
  return `https://kurslog.com/en/${from}-to-${to}`;
}

export function exchangerUrl(internalUrl: string): string {
  return `https://kurslog.com/en/exchangers/${internalUrl}`;
}

export function homeUrl(): string {
  return "https://kurslog.com/en";
}

/** Redirect URL for exchange — tracks click and redirects to exchanger site */
export function redirectUrl(params: {
  from: string;
  to: string;
  exchangerId: number;
  amount?: number;
  position?: number;
  sort?: string;
  cityUrl?: string;
}): string {
  const p = new URLSearchParams({
    from: params.from,
    to: params.to,
    amount: String(params.amount || 1),
    exchange_id: String(params.exchangerId),
    lang: "en",
    src: "extension",
    plt: "raycast",
  });
  if (params.position != null) p.set("pos", String(params.position));
  if (params.sort) p.set("sort", params.sort);
  if (params.amount) p.set("amt", String(params.amount));
  if (params.cityUrl) p.set("city_url", params.cityUrl);
  return `https://kurslog.com/api/redirect/redirect_to_exchange_service?${p}`;
}
