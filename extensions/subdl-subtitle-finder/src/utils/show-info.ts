export interface MovieInfo {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Poster: string;
  Ratings: Array<{ Source: string; Value: string }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD: string;
  BoxOffice: string;
  Production: string;
  Website: string;
  Response: string;
  // Enhanced with TMDB data
  tmdbPoster?: string;
  tmdbBackdrop?: string;
  tmdbOverview?: string;
  tmdbRating?: number;
}

class OMDbAPI {
  private baseUrl = "http://www.omdbapi.com/";

  async searchMovie(title: string, apiKey?: string): Promise<MovieInfo | null> {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append("t", title);
      url.searchParams.append("apikey", apiKey || "demo");
      url.searchParams.append("plot", "full");

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.Response === "False") {
        return null;
      }

      // Try to enhance with TMDB data for better posters
      const enhancedData = await this.enhanceWithTMDB(data);
      return enhancedData;
    } catch (error) {
      console.error("Error fetching movie info:", error);
      return null;
    }
  }

  private async enhanceWithTMDB(omdbData: MovieInfo): Promise<MovieInfo> {
    try {
      // For now, return OMDB data as is since TMDB requires API key
      // In production, users could optionally provide TMDB API key for better posters
      return {
        ...omdbData,
        tmdbPoster: undefined, // Would be populated with TMDB data if API key available
        tmdbBackdrop: undefined,
        tmdbOverview: undefined,
        tmdbRating: undefined,
      };
    } catch (error) {
      console.log("TMDB enhancement failed:", error);
      return omdbData;
    }
  }
}

export const omdbAPI = new OMDbAPI();
