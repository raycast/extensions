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
       - "last week" / "先週" = "7 days ago" to "now"
       - "yesterday" / "昨日" = "1 day ago" to "1 day ago"
       - "last month" / "先月" = "30 days ago" to "now"
       - "recent" / "最近" = "3 days ago" to "now"
       - "2 weeks" / "2週間" = "14 days ago" to "now"
       - "ここ2週間" = "14 days ago" to "now"
    3. Status: Incident status (map to: "active", "resolved", "closed", "cancelled")
    4. Severity: Incident severity (map to: "critical", "major", "minor", "info")
    5. Teams: Team names mentioned
    6. Services: Service names mentioned
    
    For time ranges, use these exact formats:
    - start: "X days ago" or "X weeks ago" (where X is a number)
    - end: "now" or "X days ago"
    
    Return ONLY a valid JSON object with this structure:
    {
      "keywords": ["keyword1", "keyword2"],
      "timeRange": {
        "start": "X days ago or X weeks ago or null",
        "end": "now or X days ago or null"
      },
      "status": ["status1"] or null,
      "severity": ["severity1"] or null,
      "teams": ["team1"] or null,
      "services": ["service1"] or null
    }
    
    Examples:
    - "critical database incidents from last week" → {"keywords": ["database"], "timeRange": {"start": "7 days ago", "end": "now"}, "severity": ["critical"]}
    - "ここ2週間の障害" → {"keywords": ["障害"], "timeRange": {"start": "14 days ago", "end": "now"}}
    - "recent API failures affecting payments team" → {"keywords": ["API", "failure", "payments"], "timeRange": {"start": "3 days ago", "end": "now"}, "teams": ["payments"]}`;

    try {
      const response = await AI.ask(prompt, { 
        creativity: 0.1,
        model: AI.Model.OpenAI_GPT4o
      });
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Process time ranges
        if (parsed.timeRange) {
          const now = new Date();
          
          // Handle various time range formats
          if (parsed.timeRange.start) {
            if (parsed.timeRange.start.includes("days ago")) {
              const daysMatch = parsed.timeRange.start.match(/(\d+)\s*days?\s*ago/);
              if (daysMatch) {
                const daysAgo = parseInt(daysMatch[1]);
                const startDate = new Date(now);
                startDate.setDate(startDate.getDate() - daysAgo);
                startDate.setHours(0, 0, 0, 0); // Start of day
                parsed.timeRange.start = startDate.toISOString();
              }
            } else if (parsed.timeRange.start.includes("weeks ago")) {
              const weeksMatch = parsed.timeRange.start.match(/(\d+)\s*weeks?\s*ago/);
              if (weeksMatch) {
                const weeksAgo = parseInt(weeksMatch[1]);
                const startDate = new Date(now);
                startDate.setDate(startDate.getDate() - (weeksAgo * 7));
                startDate.setHours(0, 0, 0, 0); // Start of day
                parsed.timeRange.start = startDate.toISOString();
              }
            }
          }
          
          if (parsed.timeRange.end === "now ISO" || parsed.timeRange.end === "now") {
            parsed.timeRange.end = now.toISOString();
          }
          
          // Ensure dates are not in the future
          if (parsed.timeRange.start) {
            const startDate = new Date(parsed.timeRange.start);
            if (startDate > now) {
              // If start date is in the future, set it to 30 days ago
              const thirtyDaysAgo = new Date(now);
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              parsed.timeRange.start = thirtyDaysAgo.toISOString();
            }
          }
          
          if (parsed.timeRange.end) {
            const endDate = new Date(parsed.timeRange.end);
            if (endDate > now) {
              // If end date is in the future, set it to now
              parsed.timeRange.end = now.toISOString();
            }
          }
        }
        
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
      
      // Debug: Log AI parsing result
      console.log("AI Parsed Query:", JSON.stringify(parsed, null, 2));
      
      // Build API query parameters
      const params: any = {
        page_size: 50,
      };
      
      // Add time range filter - use YYYY-MM-DD format as required by API
      // incident.io API seems to accept only one operator at a time
      if (parsed.timeRange?.start && parsed.timeRange?.end) {
        // For now, use only the end date to get recent incidents
        const endDate = new Date(parsed.timeRange.end).toISOString().split('T')[0];
        params["created_at[lte]"] = endDate;
        console.log("Note: Using only end date due to API limitation");
      } else if (parsed.timeRange?.start) {
        const startDate = new Date(parsed.timeRange.start).toISOString().split('T')[0];
        params["created_at[gte]"] = startDate;
      } else if (parsed.timeRange?.end) {
        const endDate = new Date(parsed.timeRange.end).toISOString().split('T')[0];
        params["created_at[lte]"] = endDate;
      }
      
      // Debug: Log what parameters we're actually sending
      console.log("Date filter being used:", {
        hasStartAndEnd: !!(parsed.timeRange?.start && parsed.timeRange?.end),
        actualParam: Object.keys(params).find(key => key.startsWith('created_at')),
        value: params[Object.keys(params).find(key => key.startsWith('created_at')) || ''],
      });
      
      // Add status filter
      if (parsed.status && parsed.status.length > 0) {
        params["incident_status[category]"] = parsed.status.join(",");
      }
      
      // Add severity filter if API supports it
      if (parsed.severity && parsed.severity.length > 0) {
        params["severity"] = parsed.severity.join(",");
      }
      
      // Debug: Log API parameters
      console.log("API Parameters:", JSON.stringify(params, null, 2));
      console.log("Full API URL:", `https://api.incident.io/v2/incidents?${new URLSearchParams(params).toString()}`);
      
      // Debug: Log time range details
      if (parsed.timeRange) {
        console.log("Time Range Details:", {
          start: parsed.timeRange.start,
          end: parsed.timeRange.end,
          startDate: parsed.timeRange.start ? new Date(parsed.timeRange.start) : null,
          endDate: parsed.timeRange.end ? new Date(parsed.timeRange.end) : null,
        });
      }
      
      // Debug: Log the actual request being sent
      console.log("Axios request config:", {
        method: 'GET',
        url: "https://api.incident.io/v2/incidents",
        params: params,
        paramsSerialized: new URLSearchParams(params).toString(),
      });
      
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
    } catch (err: any) {
      console.error("API Error Details:", {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        errors: err.response?.data?.errors ? JSON.stringify(err.response.data.errors, null, 2) : null,
        headers: err.response?.headers,
        config: {
          url: err.config?.url,
          params: err.config?.params,
        }
      });
      
      const errorMessage = err.response?.data?.message || err.message || "Search failed";
      setError(`${err.response?.status || 'Error'}: ${errorMessage}`);
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