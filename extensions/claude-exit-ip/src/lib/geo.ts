export type GeoResult =
  | {
      kind: "ok";
      country: string;
      countryCode: string;
      city: string;
      isp?: string;
      asn?: number | string;
    }
  | { kind: "failed" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseGeo(json: unknown): GeoResult {
  if (!isRecord(json) || json.success === false) return { kind: "failed" };

  const country = json.country;
  const countryCode = json.country_code;
  const city = json.city;
  const connection = json.connection;

  if (
    typeof country !== "string" ||
    typeof countryCode !== "string" ||
    typeof city !== "string" ||
    !isRecord(connection)
  ) {
    return { kind: "failed" };
  }

  const isp = typeof connection.isp === "string" && connection.isp.trim() ? connection.isp.trim() : undefined;
  const asn = typeof connection.asn === "number" || typeof connection.asn === "string" ? connection.asn : undefined;

  return {
    kind: "ok",
    country,
    countryCode: countryCode.toUpperCase(),
    city,
    ...(isp ? { isp } : {}),
    ...(asn !== undefined ? { asn } : {}),
  };
}
