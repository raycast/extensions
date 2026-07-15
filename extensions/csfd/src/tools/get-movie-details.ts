import { csfd } from "node-csfd-api";

type Input = {
  /**
   * The ČSFD ID of the movie or TV show
   */
  movieId: number;
};

interface Creator {
  name: string;
  id?: number;
}

interface DescriptionObject {
  value?: string;
  content?: string;
  text?: string;
  description?: string;
  csfd?: string;
  short?: string;
}

interface VodItem {
  title: string;
  url: string;
}

/**
 * Get detailed information about a movie or TV show from ČSFD
 * Returns comprehensive details including description, rating, cast, etc.
 */
export default async function tool(input: Input) {
  const { movieId } = input;

  if (!movieId) {
    return { error: "Please provide a valid movie ID" };
  }

  try {
    const movie = await csfd.movie(movieId);

    // Format cast information
    const directors = movie?.creators?.directors?.map((d: Creator) => d.name).join(", ") || "N/A";
    const actors =
      movie?.creators?.actors
        ?.slice(0, 5)
        ?.map((a: Creator) => a.name)
        .join(", ") || "N/A";

    // Get proper description
    let description = "No description available.";
    if (typeof movie?.descriptions === "object" && movie?.descriptions !== null) {
      if (Array.isArray(movie.descriptions) && movie.descriptions.length > 0) {
        // Try to get the first description
        const firstDesc = movie.descriptions[0];
        if (typeof firstDesc === "object" && firstDesc !== null) {
          const descObj = firstDesc as DescriptionObject;
          description =
            descObj.value || descObj.content || descObj.text || descObj.description || "No description available.";
        } else if (typeof firstDesc === "string") {
          description = firstDesc;
        }
      } else if (!Array.isArray(movie.descriptions)) {
        // Try to get from object properties
        const descObj = movie.descriptions as DescriptionObject;
        description = descObj.csfd || descObj.short || descObj.content || descObj.text || "No description available.";
      }
    } else if (typeof movie?.descriptions === "string") {
      description = movie.descriptions;
    }

    // Get VOD providers if available
    const vodProviders: VodItem[] = [];
    if (movie.vod && Array.isArray(movie.vod)) {
      for (const item of movie.vod) {
        if (typeof item === "object" && item !== null && item.title && item.url) {
          vodProviders.push({
            title: item.title,
            url: item.url,
          });
        }
      }
    }

    // Format final response
    return {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      rating: movie.rating,
      colorRating: movie.colorRating,
      poster: movie.poster,
      genres: movie.genres || [],
      origins: movie.origins || [],
      duration: movie.duration,
      description,
      cast: {
        directors,
        actors,
      },
      watchOn: vodProviders,
      url: `https://www.csfd.cz/film/${movie.id}`,
    };
  } catch (error) {
    console.error("Error fetching movie details:", error);
    return {
      error: `Failed to fetch movie details: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
