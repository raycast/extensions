export interface WikipediaOnThisDay {
  year: number;
  pages: WikipediaPage[];
  eventDescription: string;
}

export interface WikipediaPage {
  title: string;
  extract: string;
  pageUrl: string;
  imageUrl: string;
}

/**
 *  JSON response from the Wikipedia API
 **/

export interface WikipediaPageJson {
  normalizedtitle: string;
  extract: string;
  content_urls: {
    desktop: {
      page: string;
    };
  };
  thumbnail: {
    source: string;
  };
}

export interface OnThisDayJson {
  text: string;
  pages: WikipediaPageJson[];
  year: number;
}

export interface ApiResponse {
  onthisday: OnThisDayJson[];
}
