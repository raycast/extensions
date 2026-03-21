import { API_CONFIG, QUERY_FIELDS, SUPPORTED_PLATFORMS } from "./constants";
import type { SearchResult, ElasticsearchResponse, ElasticsearchError, ElasticsearchCodeError } from "./types";

/**
 * Fetches the search URL for a given NixOS branch
 */
export async function getSearchUrl({ branchName }: { branchName: string }): Promise<string> {
  const resp = await fetch(API_CONFIG.versionUrl);
  if (!resp.ok) throw new Error("Cannot access GitHub");

  const text = await resp.text();

  // extract frontend = "NN";
  const m = text.match(/frontend\s*=\s*"([^"]+)"\s*;/);
  if (!m) throw new Error("Cannot parse frontend version from version.nix");

  const frontend = m[1].trim();
  return `${API_CONFIG.searchBaseUrl}/latest-${frontend}-nixos-${branchName}/_search`;
}

/**
 * Builds the Elasticsearch query for searching packages
 */
export function buildSearchQuery(searchText: string, searchSize: number) {
  const reversedSearchText = [...searchText].reverse().join("");

  return {
    size: searchSize,
    sort: [{ _score: "desc" }, { package_attr_name: "desc" }, { package_pversion: "desc" }],
    query: {
      bool: {
        filter: [{ term: { type: { value: "package", _name: "filter_packages" } } }],
        must: [
          {
            dis_max: {
              tie_breaker: 0.7,
              queries: [
                {
                  multi_match: {
                    type: "cross_fields",
                    query: searchText,
                    analyzer: "whitespace",
                    auto_generate_synonyms_phrase_query: false,
                    operator: "and",
                    _name: `multi_match_${searchText}`,
                    fields: QUERY_FIELDS,
                  },
                },
                {
                  multi_match: {
                    type: "cross_fields",
                    query: reversedSearchText,
                    analyzer: "whitespace",
                    auto_generate_synonyms_phrase_query: false,
                    operator: "and",
                    _name: `multi_match_${reversedSearchText}`,
                    fields: QUERY_FIELDS,
                  },
                },
                { wildcard: { package_attr_name: { value: `*${searchText}*` } } },
              ],
            },
          },
        ],
      },
    },
  };
}

/**
 * Parses the Elasticsearch response and transforms it into SearchResult objects
 */
export async function parseSearchResponse(response: Response): Promise<SearchResult[]> {
  const json = (await response.json()) as ElasticsearchResponse | ElasticsearchError | ElasticsearchCodeError;

  if ("code" in json) {
    throw new Error(json.message);
  } else if ("error" in json) {
    throw new Error(json.error.reason);
  } else if (!response.ok) {
    throw new Error(response.statusText);
  }

  return json.hits.hits.map(({ _source: result, _id: id }) => {
    return {
      id,
      name: result.package_pname,
      attrName: result.package_attr_name,
      description: result.package_description,
      version: result.package_pversion,
      homepage: result.package_homepage,
      source:
        result.package_position && `${API_CONFIG.githubBaseUrl}/${result.package_position.replace(/:([0-9]+)$/, "")}`,
      outputs: result.package_outputs,
      defaultOutput: result.package_default_output,
      platforms: result.package_platforms.filter((platform) =>
        SUPPORTED_PLATFORMS.includes(platform as (typeof SUPPORTED_PLATFORMS)[number]),
      ),
      licenses: result.package_license.map((license) => {
        let url: string | null;
        try {
          url = license.url ?? new URL(license.fullName).href;
        } catch {
          url = null;
        }
        return { name: license.fullName, url };
      }),
    };
  });
}
