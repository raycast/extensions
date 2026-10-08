export type Media = {
  id: number;
  coverImage: {
    extraLarge: string;
    large: string;
  };
  description: string;
  externalLinks: {
    id: string;
    url: string;
    site: string;
    color: string;
    type: string;
  }[];
  nextAiringEpisode: NextAiringEpisode;
  siteUrl: string;
  status: string;
  title: {
    english: string;
    romaji: string;
  };
};

export type NextAiringEpisode = {
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
};

export type Result = {
  data: {
    Page: {
      pageInfo: {
        currentPage: number;
        hasNextPage: boolean;
        lastPage: number;
        perPage: number;
        total: number;
      };
      media: Media[];
    };
  };
};
