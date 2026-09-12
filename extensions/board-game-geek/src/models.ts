export type BggSearchResponse = BoardGame[];
export type BggDetailsResponse = GameDetails;

export interface BoardGame {
  bggId: string;
  title: string;
  url: string;
}
export interface GameDetails {
  bggId?: string;
  title?: string;
  img?: string;
  description?: string;
  minPlayers?: number;
  maxPlayers?: number;
  avgPlaytime?: number;
}

export interface BoardGameXml {
  elements: {
    elements: {
      attributes: {
        id: string;
      };
      elements: {
        name: string;
        attributes: {
          value: string;
        };
      }[];
    }[];
  }[];
}

export interface GameDetailsXml {
  items: {
    item: {
      _attributes: {
        objectid: string;
      };
      name: {
        _text: string;
      };
      thumbnail: {
        _text: string;
      };
      description: {
        _text: string;
      };
      minplayers: {
        _attributes: {
          value: string;
        };
      };
      maxplayers: {
        _attributes: {
          value: string;
        };
      };
      playingtime: {
        _attributes: {
          value: string;
        };
      };
    };
  };
}
