export const BASE_URL = "https://www.sharplyphoto.com";

export interface Gear {
  slug: string;
  name: string;
  brandName: string | null;
  gearType: string;
  thumbnailUrl: string | null;
  estimatedUsedUsdCents?: number | null;
}

export function gearUrl(slug: string): string {
  return `${BASE_URL}/gear/${encodeURIComponent(slug)}`;
}

export function usedPrice(item: object): number | null {
  if (!("usedPriceProjection" in item)) return null;
  const projection = item.usedPriceProjection;
  if (!projection || typeof projection !== "object" || !("US" in projection))
    return null;
  const estimate = projection.US;
  if (
    !estimate ||
    typeof estimate !== "object" ||
    !("status" in estimate) ||
    (estimate.status !== "current" && estimate.status !== "stale") ||
    !("typical" in estimate)
  )
    return null;
  const amount = estimate.typical;
  return typeof amount === "number" && Number.isInteger(amount) && amount > 0
    ? amount
    : null;
}

export async function searchGear(query: string): Promise<Gear[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const params = new URLSearchParams({
    q: trimmed,
    page: "1",
    pageSize: "25",
    includeTotal: "false",
  });
  const response = await fetch(`${BASE_URL}/api/search?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Sharply blocked this request. Open website search or try again later.",
      );
    }
    if (response.status === 429) {
      throw new Error(
        "Sharply's request limit was reached. Try again in a minute.",
      );
    }
    throw new Error(
      `Sharply is unavailable (HTTP ${response.status}). Try again later.`,
    );
  }
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      "Sharply returned a browser security checkpoint. Open website search or try again later.",
    );
  }
  const payload: unknown = await response.json();
  if (
    !payload ||
    typeof payload !== "object" ||
    !("results" in payload) ||
    !Array.isArray(payload.results)
  ) {
    throw new Error("Sharply returned an invalid search response.");
  }
  return payload.results.map((item: unknown) => {
    if (
      !item ||
      typeof item !== "object" ||
      !("slug" in item) ||
      typeof item.slug !== "string" ||
      !("name" in item) ||
      typeof item.name !== "string" ||
      !("gearType" in item) ||
      typeof item.gearType !== "string"
    ) {
      throw new Error("Sharply returned an invalid gear item.");
    }
    return {
      estimatedUsedUsdCents: usedPrice(item),
      slug: item.slug,
      name: item.name,
      gearType: item.gearType,
      brandName:
        "brandName" in item && typeof item.brandName === "string"
          ? item.brandName
          : null,
      thumbnailUrl:
        "thumbnailUrl" in item && typeof item.thumbnailUrl === "string"
          ? item.thumbnailUrl
          : null,
    };
  });
}
