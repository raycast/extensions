export type Movie = {
  filmId: number;
  nameRu: string;
  nameEn: string;
  description?: string;
  year: string;
  rating?: string;
  posterUrlPreview: string;
  posterUrl: string;
  filmLength?: string;
};

export function movieTitle(movie: Movie): string {
  let title = "";

  if (movie.nameRu) {
    title = movie.nameRu;
  }

  if (movie.nameEn) {
    if (title) {
      title += ` (${movie.nameEn})`;
    } else {
      title = movie.nameEn;
    }
  }
  return title;
}

export function movieRating(movie: Movie): string | undefined {
  return movie.rating != "null" ? `★ ${movie.rating}` : undefined; // yes, this is weird API...
}

export interface SearchResult {
  isLoading: boolean;
  movies?: Movie[];
  error?: string;
}
