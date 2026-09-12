import { AI } from "@raycast/api";
import { useState, useCallback, useRef } from "react";
import axios from "axios";

interface ParsedQuery {
  keywords: string[];
}

interface Incident {
  id: string;
  name: string;
  permalink: string;
  created_at: string;
  status: string;
  summary?: string;
  severity?: string;
}

interface UseAIIncidentSearchResult {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
  parsedQuery: ParsedQuery | null;
  searchWithAI: (query: string) => Promise<void>;
}

const QUERY_CACHE_SIZE = 20;

export function useAIIncidentSearch(apiKey: string): UseAIIncidentSearchResult {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);

  // Cache for parsed queries
  const queryCache = useRef<Map<string, ParsedQuery>>(new Map());

  const parseQueryWithAI = useCallback(async (query: string): Promise<ParsedQuery> => {
    // Check cache first
    if (queryCache.current.has(query)) {
      return queryCache.current.get(query)!;
    }

    const prompt = `Extract important keywords from the following incident search query.
    Query: "${query}"
    
    Extract meaningful search terms that would help find relevant incidents.
    Include both English and original language terms if applicable.
    Focus on technical terms, service names, error types, and important descriptive words.
    
    Return ONLY a valid JSON object with this structure:
    {
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
    
    Examples:
    - "database connection errors" → {"keywords": ["database", "connection", "errors"]}
    - "API failures in payment service" → {"keywords": ["API", "failures", "payment", "service"]}
    - "ここ2週間の障害" → {"keywords": ["障害"]}
    - "critical outage last week" → {"keywords": ["critical", "outage"]}`;

    try {
      const response = await AI.ask(prompt, {
        creativity: 0.1,
        model: AI.Model.OpenAI_GPT4o,
      });

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Cache the result
        if (queryCache.current.size >= QUERY_CACHE_SIZE) {
          const firstKey = queryCache.current.keys().next().value;
          if (firstKey) {
            queryCache.current.delete(firstKey);
          }
        }
        queryCache.current.set(query, parsed);

        return parsed;
      }

      // Fallback
      const fallback = {
        keywords: query.split(" ").filter((word) => word.length > 2),
      };
      queryCache.current.set(query, fallback);
      return fallback;
    } catch (error) {
      console.error("AI parsing error:", error);
      const fallback = {
        keywords: query.split(" ").filter((word) => word.length > 2),
      };
      queryCache.current.set(query, fallback);
      return fallback;
    }
  }, []);

  const searchWithAI = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setError("Please enter a search query");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Parse query with AI
        const parsed = await parseQueryWithAI(query);
        setParsedQuery(parsed);

        // Debug: Log AI parsing result
        console.log("AI Parsed Query:", JSON.stringify(parsed, null, 2));

        // Build API query parameters - fetch all incidents for client-side filtering
        const params: Record<string, string> = {
          page_size: "50",
        };

        // Debug: Log the actual request being sent
        console.log("Axios request config:", {
          method: "GET",
          url: "https://api.incident.io/v2/incidents",
          params: params,
          paramsSerialized: new URLSearchParams(params).toString(),
        });

        // Fetch incidents from API
        // Reference: https://api-docs.incident.io/tag/Incidents-V2
        const response = await axios.get<{
          incidents: Array<{
            id: string;
            name: string;
            permalink: string;
            created_at: string;
            incident_status: {
              category: string;
            };
            summary?: string;
            severity?: string;
          }>;
        }>("https://api.incident.io/v2/incidents", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          params,
        });

        if (response.data && Array.isArray(response.data.incidents)) {
          let filteredIncidents = response.data.incidents;

          // Client-side filtering by keywords in title and description
          if (parsed.keywords && parsed.keywords.length > 0) {
            filteredIncidents = filteredIncidents.filter((incident) => {
              const searchText = `${incident.name} ${incident.summary || ""}`.toLowerCase();
              return parsed.keywords.some((keyword) => searchText.includes(keyword.toLowerCase()));
            });
          }

          // Sort by relevance (keyword matches) and recency
          filteredIncidents.sort((a, b) => {
            const aText = `${a.name} ${a.summary || ""}`.toLowerCase();
            const bText = `${b.name} ${b.summary || ""}`.toLowerCase();

            let aScore = 0;
            let bScore = 0;

            parsed.keywords.forEach((keyword) => {
              if (aText.includes(keyword.toLowerCase())) aScore++;
              if (bText.includes(keyword.toLowerCase())) bScore++;
            });

            if (aScore !== bScore) {
              return bScore - aScore;
            }

            // If same score, sort by date
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          // Map to our incident structure
          const mappedIncidents = filteredIncidents.map((incident) => ({
            id: incident.id,
            name: incident.name,
            permalink: incident.permalink,
            created_at: incident.created_at,
            status: incident.incident_status.category,
            summary: incident.summary,
            severity: incident.severity,
          }));

          setIncidents(mappedIncidents);
        }
      } catch (err: unknown) {
        const isAxiosError = (
          error: unknown,
        ): error is {
          response?: {
            status?: number;
            statusText?: string;
            data?: { message?: string; errors?: unknown };
            headers?: unknown;
          };
          config?: { url?: string; params?: unknown };
          message?: string;
        } => {
          return typeof error === "object" && error !== null;
        };

        if (isAxiosError(err)) {
          console.error("API Error Details:", {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
            errors: err.response?.data?.errors ? JSON.stringify(err.response.data.errors, null, 2) : null,
            headers: err.response?.headers,
            config: {
              url: err.config?.url,
              params: err.config?.params,
            },
          });

          const errorMessage = err.response?.data?.message || err.message || "Search failed";
          setError(`${err.response?.status || "Error"}: ${errorMessage}`);
        } else {
          console.error("Unknown error:", err);
          setError("An unexpected error occurred");
        }
        setIncidents([]);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, parseQueryWithAI],
  );

  return {
    incidents,
    loading,
    error,
    parsedQuery,
    searchWithAI,
  };
}
