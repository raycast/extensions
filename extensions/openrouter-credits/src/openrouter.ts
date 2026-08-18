export interface CreditsData {
  total_credits: number;
  total_usage: number;
}

interface CreditsResponse {
  data: CreditsData;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function isCreditsData(value: unknown): value is CreditsData {
  if (!value || typeof value !== "object") return false;

  const data = value as CreditsData;
  return (
    Number.isFinite(data.total_credits) && Number.isFinite(data.total_usage)
  );
}

function isCreditsResponse(value: unknown): value is CreditsResponse {
  return Boolean(
    value &&
    typeof value === "object" &&
    isCreditsData((value as CreditsResponse).data),
  );
}

export async function fetchCredits(apiKey: string): Promise<CreditsData> {
  const response = await fetch("https://openrouter.ai/api/v1/credits", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid management API key");
    }
    throw new Error(`HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isCreditsResponse(data)) throw new Error("Unexpected API response");

  return data.data;
}
