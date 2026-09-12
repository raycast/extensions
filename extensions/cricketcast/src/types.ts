type XMLText = {
  _text: string;
};
export type MatchItem = {
  title: XMLText;
  guid: XMLText;
  link: XMLText;
};
export type InDepthData = {
  match: {
    current_summary: string;
  };
  live: {
    status: string;
    innings: {
      batting_team_id: string;
    };
  };
  team: Array<{
    team_id: string;
    logo_image_path: string;
  }>;
};
export type NewsItem = {
  title: XMLText;
  description: XMLText;
  coverImages: XMLText;
  "media:content": {
    _attributes: {
      medium: "image";
      url: string;
      width: string;
      height: string;
    };
  };
  link: XMLText;
  guid: XMLText;
  pubDate: XMLText;
};
export type RSS<T> = {
  rss: {
    channel: {
      item: T[];
    };
  };
};
