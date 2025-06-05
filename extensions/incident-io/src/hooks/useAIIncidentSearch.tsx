import { AI } from "@raycast/api";
import { useState, useCallback, useRef } from "react";
import axios from "axios";

interface ParsedQuery {
  keywords: string[];
  timeRange?: {
    start?: string;
    end?: string;
  };
  status?: string[];
  severity?: string[];
  teams?: string[];
  services?: string[];
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

    const prompt = `Parse the following natural language query about incidents into structured search parameters.
    Query: "${query}"
    
    Extract the following information:
    1. Keywords: Important terms to search for (include both English and original language if applicable)
    2. Time range: When the incidents occurred
       - "last week" = 7 days ago to now
       - "yesterday" = 1 day ago
       - "last month" = 30 days ago to now
       - "in March" = March 1 to March 31 of current year
       - "recent" = last 3 days
    3. Status: Incident status (map to: "active", "resolved", "closed", "cancelled")
    4. Severity: Incident severity (map to: "critical", "major", "minor", "info")
    5. Teams: Team names mentioned
    6. Services: Service names mentioned
    
    Return ONLY a valid JSON object with this structure:
    {
      "keywords": ["keyword1", "keyword2"],
      "timeRange": {
        "start": "ISO date string or null",
        "end": "ISO date string or null"
      },
      "status": ["status1"] or null,
      "severity": ["severity1"] or null,
      "teams": ["team1"] or null,
      "services": ["service1"] or null
    }
    
    Examples:
    - "critical database incidents from last week" → {"keywords": ["database"], "timeRange": {"start": "7 days ago ISO", "end": "now ISO"}, "severity": ["critical"]}
    - "resolved network issues in production yesterday" → {"keywords": ["network", "production"], "timeRange": {"start": "1 day ago ISO", "end": "1 day ago end of day ISO"}, "status": ["resolved"]}
    - "recent API failures affecting payments team" → {"keywords": ["API", "failure", "payments"], "timeRange": {"start": "3 days ago ISO", "end": "now ISO"}, "teams": ["payments"]}`;

    try {
      const response = await AI.ask(prompt, { 
        creativity: 0.1,
        model: AI.Model["OpenAI_GPT4o-mini"]
      });
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Process time ranges
        if (parsed.timeRange) {
          const now = new Date();
          
          if (parsed.timeRange.start?.includes("days ago")) {
            const daysAgo = parseInt(parsed.timeRange.start);
            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - daysAgo);
            parsed.timeRange.start = startDate.toISOString();
          }
          
          if (parsed.timeRange.end === "now ISO") {
            parsed.timeRange.end = now.toISOString();
          }
        }
        
        // Cache the result
        if (queryCache.current.size >= QUERY_CACHE_SIZE) {
          const firstKey = queryCache.current.keys().next().value;
          queryCache.current.delete(firstKey);
        }
        queryCache.current.set(query, parsed);
        
        return parsed;
      }
      
      // Fallback
      const fallback = {
        keywords: query.split(" ").filter(word => word.length > 2),
      };
      queryCache.current.set(query, fallback);
      return fallback;
    } catch (error) {
      console.error("AI parsing error:", error);
      const fallback = {
        keywords: query.split(" ").filter(word => word.length > 2),
      };
      queryCache.current.set(query, fallback);
      return fallback;
    }
  }, []);

  const searchWithAI = useCallback(async (query: string) => {
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
      
      // Build API query parameters
      const params: any = {
        page_size: 50,
      };
      
      // Add time range filter
      if (parsed.timeRange?.start) {
        params["created_at[gte]"] = parsed.timeRange.start;
      }
      if (parsed.timeRange?.end) {
        params["created_at[lte]"] = parsed.timeRange.end;
      }
      
      // Add status filter
      if (parsed.status && parsed.status.length > 0) {
        params["incident_status[category]"] = parsed.status.join(",");
      }
      
      // Add severity filter if API supports it
      if (parsed.severity && parsed.severity.length > 0) {
        params["severity"] = parsed.severity.join(",");
      }
      
      // Fetch incidents from API
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
        
        // Client-side filtering by keywords
        if (parsed.keywords && parsed.keywords.length > 0) {
          filteredIncidents = filteredIncidents.filter(incident => {
            const searchText = `${incident.name} ${incident.summary || ""}`.toLowerCase();
            return parsed.keywords.some(keyword => 
              searchText.includes(keyword.toLowerCase())
            );
          });
        }
        
        // Client-side filtering by teams/services if mentioned in name/summary
        if (parsed.teams && parsed.teams.length > 0) {
          filteredIncidents = filteredIncidents.filter(incident => {
            const searchText = `${incident.name} ${incident.summary || ""}`.toLowerCase();
            return parsed.teams!.some(team => 
              searchText.includes(team.toLowerCase())
            );
          });
        }
        
        // Sort by relevance (keyword matches) and recency
        filteredIncidents.sort((a, b) => {
          const aText = `${a.name} ${a.summary || ""}`.toLowerCase();
          const bText = `${b.name} ${b.summary || ""}`.toLowerCase();
          
          let aScore = 0;
          let bScore = 0;
          
          parsed.keywords.forEach(keyword => {
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Search failed";
      setError(errorMessage);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [apiKey, parseQueryWithAI]);

  return {
    incidents,
    loading,
    error,
    parsedQuery,
    searchWithAI,
  };
} 