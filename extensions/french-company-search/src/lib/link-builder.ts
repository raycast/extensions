/**
 * Build the search URL for Pappers based on the most reliable identifier available.
 * Prioritises SIREN, then SIRET, and finally falls back to a textual query such as the denomination.
 */
export function buildPappersSearchUrl(params: {
  siren?: string | null;
  siret?: string | null;
  denomination?: string | null;
}): string | undefined {
  const query = normaliseSiren(params.siren) ?? normaliseSiret(params.siret) ?? normaliseText(params.denomination);

  if (!query) {
    return undefined;
  }

  return `https://www.pappers.fr/recherche?q=${encodeURIComponent(query)}`;
}

function normaliseSiren(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");
  return digits.length === 9 ? digits : undefined;
}

function normaliseSiret(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");
  return digits.length === 14 ? digits : undefined;
}

function normaliseText(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
