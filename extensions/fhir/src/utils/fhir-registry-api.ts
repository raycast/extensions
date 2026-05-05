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
  id: number;
  title: string;
  category?: string;
  resourceType: string;
  simplifierUrl: string;
  jsonUrl: string;
}

export interface FHIRPackageDetails {
  entity: {
    _source: {
      canonical: string;
      url: string;
      name: string;
      version: string;
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
  const { name, version } = response.entity._source;
  const contents = response.entity._source.contents || [];
  return (
    contents.map((item) => ({
      id: item.id,
      canonical: item.canonical,
      title: item.title,
      resourceType: item.resourceType,
      simplifierUrl: `https://simplifier.net/packages/${name}/${version}/files/${item.id}`,
      jsonUrl: `https://simplifier.net/ui/packagefile/downloadas?packageName=${name}&version=${version}&packageFileId=${item.id}&format=json`,
    })) || []
  );
}
