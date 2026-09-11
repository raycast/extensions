interface ClearoutAutocompleteResponse {
  status: string;
  data: Array<{
    name: string;
    domain: string;
    confidence_score: number;
    logo_url: string;
  }>;
}

export interface CompanySearchResult {
  name: string;
  domain: string;
  confidence_score: number;
  logo_url: string;
}

export async function searchCompanyByName(query: string): Promise<CompanySearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.clearout.io/public/companies/autocomplete?query=${encodeURIComponent(query.trim())}`,
    );

    if (!response.ok) {
      console.error("Clearout API error:", response.status);
      return [];
    }

    const data = (await response.json()) as ClearoutAutocompleteResponse;
    if (data.status !== "success" || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((item) => ({
      name: item.name,
      domain: item.domain,
      confidence_score: item.confidence_score,
      logo_url: item.logo_url,
    }));
  } catch (error) {
    console.error("Failed to search company:", error);
    return [];
  }
}
