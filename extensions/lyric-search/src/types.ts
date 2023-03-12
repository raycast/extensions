export type LyricSearchResponse = {
  meta: {
    status: number;
  };
  response: {
    sections: LyricSearchSection[];
  };
};

export type LyricSearchSection = {
  hits: LyricSearchHit[];
  type: string;
};

export type LyricSearchHit = {
  highlights: LyricHighlight[];
  index: string;
  type: string;
  result: {
    title: string;
    artist_names: string;
    header_image_thumbnail_url: string;
    header_image_url: string;
    id: number;
    path: string;
  };
};

export type LyricHighlight = {
  value: string;
  property: string;
  ranges: LyricHighlightRange[];
};

export type LyricHighlightRange = {
  start: number;
  end: number;
};
