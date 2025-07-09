import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface FHIRPackage {
  id: string;
  name: string;
  title: string;
  version: string;
  description: string;
  canonical: string;
  url: string;
  publisher?: string;
  author?: string;
  fhirMajorVersion: number[];
  latest: boolean;
  totalDownloads: number;
  date: string;
}

export interface FHIRPackageContent {
  fileName?: string;
  canonical: string;
  url: string;
  id: number;
  title: string;
  category?: string;
  resourceType: string;
}

export interface FHIRPackageDetails {
  entity: {
    _source: {
      canonical: string;
      url: string;
      contents: FHIRPackageContent[];
    };
  };
}

export interface FHIRResourceDetail {
  resourceType: string;
  id: string;
  url?: string;
  version?: string;
  name?: string;
  title?: string;
  status?: string;
  experimental?: boolean;
  date?: string;
  publisher?: string;
  description?: string;
  contact?: Array<{
    name?: string;
    telecom?: Array<{
      system: string;
      value: string;
    }>;
  }>;
  jurisdiction?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  }>;
  mapping?: Array<{
    identity: string;
    uri?: string;
    name?: string;
  }>;
  [key: string]: unknown;
}

export function getSearchPackagesUrl(): string {
  return "https://registry.fhir.org/api/search/records/_msearch?";
}

export function getSearchPackagesOptions(query: string): RequestInit {
  // Multi-search format with NDJSON
  const header = JSON.stringify({ preference: "SearchResult" });
  const queryBody = JSON.stringify({
    query: {
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    should: [
                      {
                        multi_match: {
                          query: query,
                          fields: [
                            "canonical^5",
                            "title^4",
                            "description^4",
                            "name^4",
                            "version^1",
                            "keyWords^1",
                            "maintainers.name^1",
                            "author^1",
                            "contents.title^1",
                            "contents.canonical^1",
                            "contents.fileName^1",
                          ],
                          type: "best_fields",
                          operator: "and",
                          fuzziness: 1,
                        },
                      },
                      {
                        multi_match: {
                          query: query,
                          fields: [
                            "canonical^5",
                            "title^4",
                            "description^4",
                            "name^4",
                            "version^1",
                            "keyWords^1",
                            "maintainers.name^1",
                            "author^1",
                            "contents.title^1",
                            "contents.canonical^1",
                            "contents.fileName^1",
                          ],
                          type: "phrase",
                          operator: "and",
                        },
                      },
                      {
                        multi_match: {
                          query: "fhir hl7 argonaut carin davinci",
                          fields: ["name"],
                          type: "phrase",
                          operator: "or",
                        },
                      },
                      {
                        boosting: {
                          positive: {
                            multi_match: {
                              query: query,
                              fields: ["canonical", "title", "description", "name"],
                              type: "best_fields",
                              operator: "and",
                            },
                          },
                          negative: {
                            multi_match: {
                              query: "test training testing dummy",
                              fields: ["title^0.1", "name^0.1", "description^0.1"],
                              type: "best_fields",
                              operator: "or",
                            },
                          },
                          negative_boost: 1,
                        },
                      },
                      {
                        nested: {
                          path: "contents",
                          query: {
                            bool: {
                              must: [
                                {
                                  multi_match: {
                                    query: query,
                                    fields: ["contents.title", "contents.canonical"],
                                    type: "most_fields",
                                    operator: "or",
                                  },
                                },
                              ],
                            },
                          },
                          inner_hits: {
                            size: 5,
                            explain: true,
                            sort: { _score: "desc" },
                          },
                        },
                      },
                    ],
                    minimum_should_match: "1",
                  },
                },
                {
                  bool: {
                    boost: 1,
                    minimum_should_match: 1,
                    should: [{ term: { latest: true } }],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    size: 10,
    _source: { includes: ["*"], excludes: [] },
  });

  const requestBody = `${header}\n${queryBody}`;

  return {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-ndjson",
      referer: "https://registry.fhir.org/results",
    },
    body: requestBody,
  };
}

export function parseSearchPackagesResponse(data: unknown): FHIRPackage[] {
  // Multi-search response structure
  const response = data as {
    responses?: Array<{ hits?: { hits?: Array<{ _source: FHIRPackage }> } }>;
  };
  const results = response.responses?.[0]?.hits?.hits || [];

  return results.map((hit) => ({
    id: hit._source.id,
    name: hit._source.name,
    title: hit._source.title,
    version: hit._source.version,
    description: hit._source.description,
    canonical: hit._source.canonical,
    url: hit._source.url,
    publisher: hit._source.publisher,
    author: hit._source.author,
    fhirMajorVersion: hit._source.fhirMajorVersion || [],
    latest: hit._source.latest,
    totalDownloads: hit._source.totalDownloads,
    date: hit._source.date,
  }));
}

export function getPackageContentsUrl(packageId: string): string {
  const encodedPackageId = encodeURIComponent(packageId);
  return `https://registry.fhir.org/api/package/${encodedPackageId}`;
}

export function getPackageContentsOptions(): RequestInit {
  return {
    headers: {
      accept: "*/*",
    },
  };
}

export function parsePackageContentsResponse(data: unknown): FHIRPackageContent[] {
  const response = data as FHIRPackageDetails;

  const packageCanonical = response.entity._source.canonical;
  const packageUrl = response.entity._source.url;

  return (
    response.entity._source.contents
      .filter((item) => item.canonical && item.canonical.startsWith("http"))
      .map((item) => ({
        id: item.id,
        canonical: item.canonical,
        url: item.canonical.replace(packageCanonical, packageUrl),
        title: item.title,
        resourceType: item.resourceType,
      })) || []
  );
}

export function getResourceDetailOptions(): RequestInit & {
  parseResponse?: (response: Response) => Promise<unknown>;
} {
  return {
    redirect: "follow" as RequestRedirect,
    parseResponse: async (response: Response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();

      if (!text || text.trim().length === 0) {
        throw new Error("Empty response received");
      }

      const contentType = response.headers.get("content-type") || "";
      const isXml = contentType.includes("application/xml") || contentType.includes("text/xml");
      const isJson = contentType.includes("application/json") || contentType.includes("text/json");
      try {
        if (isXml) {
          return parseXmlToJson(text);
        } else if (isJson) {
          return JSON.parse(text);
        } else {
          // Fallback to content detection if content-type is unclear
          return parseResourceDetailResponse(text);
        }
      } catch (error) {
        console.error("Failed to parse FHIR resource response:", error);
        throw new Error(`Failed to parse FHIR resource: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    },
  };
}

export function parseResourceDetailResponse(data: unknown): FHIRResourceDetail {
  // If data is already a parsed object, return it
  if (typeof data === "object" && data !== null) {
    return data as FHIRResourceDetail;
  }

  // If data is a string, try to detect format and parse
  if (typeof data === "string") {
    const content = data.trim();

    // Check if it's XML by looking for XML declaration or root element
    if (content.startsWith("<?xml") || content.startsWith("<")) {
      try {
        return parseXmlToJson(content);
      } catch (error) {
        console.error("Failed to parse XML response:", error);
        throw new Error("Invalid XML response format");
      }
    }

    // Try to parse as JSON string
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error("Failed to parse response as JSON:", error);
      throw new Error("Invalid response format");
    }
  }

  return data as FHIRResourceDetail;
}

function parseXmlToJson(xmlString: string): FHIRResourceDetail {
  // Validate XML first
  const validationResult = XMLValidator.validate(xmlString);
  if (validationResult !== true) {
    throw new Error(`Invalid XML format: ${validationResult.err.msg}`);
  }
  // Configure parser options for FHIR XML
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "_text",
    parseAttributeValue: true,
    parseTrueNumberOnly: false,
    trimValues: true,
    ignoreDeclaration: true,
  };

  const parser = new XMLParser(options);
  const result = parser.parse(xmlString) as Record<string, unknown>;
  // Extract the root element (should be the FHIR resource)
  const rootKeys = Object.keys(result);
  if (rootKeys.length !== 1) {
    throw new Error("Invalid FHIR resource: expected single root element");
  }

  const rootKey = rootKeys[0];
  const resourceData = result[rootKey] as Record<string, unknown>;

  // Ensure we have the basic FHIR resource structure
  if (!resourceData.resourceType) {
    resourceData.resourceType = rootKey;
  }
  return flattenXmlValues(resourceData) as FHIRResourceDetail;
}

function flattenXmlValues(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => flattenXmlValues(item));
  }

  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;

    // If object has only one property and it's @_value, return the value
    const keys = Object.keys(record);
    if (keys.length === 1 && keys[0] === "@_value") {
      return record["@_value"];
    }

    // Otherwise, recursively process all properties
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      result[key] = flattenXmlValues(value);
    }
    return result;
  }

  return obj;
}
