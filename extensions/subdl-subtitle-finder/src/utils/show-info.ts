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
}

class OMDbAPI {
  private baseUrl = "http://www.omdbapi.com/";

  async searchMovie(title: string, apiKey?: string): Promise<MovieInfo | null> {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append("t", title);
      url.searchParams.append("apikey", apiKey || "demo");
      url.searchParams.append("plot", "short");

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.Response === "False") {
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error fetching movie info:", error);
      return null;
    }
  }
}

export const omdbAPI = new OMDbAPI();
