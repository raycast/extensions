export interface PlayerSearchResponse {
  results: Result[];
}

export interface Result {
  hits: Hit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  exhaustiveTypo: boolean;
  exhaustive: Exhaustive;
  query: string;
  params: string;
  index: string;
  processingTimeMS: number;
  processingTimingsMS: ProcessingTimingsMS;
}

export interface Exhaustive {
  nbHits: boolean;
  typo: boolean;
}

export interface Hit {
  title: string;
  url: string;
  lastUpdatedDate: number;
  contentDate: number;
  teamCode: number;
  teamFileCode: any[];
  teamName: any[];
  playerName: string[];
  homeTeamCode: null;
  awayTeamCode: null;
  gameDateTime: null;
  gamePk: null;
  gameTitle: null;
  taxonomy: any[];
  contentType: string;
  entityId: string;
  culture: string;
  thumbnailUrl: null | string;
  templateUrl: null | string;
  playerId: number;
  biography: null | string;
  playerType: null | string;
  highlight: null | Highlight[];
  position: null | string;
  drafted: null | string;
  prospectBio: null | ProspectBio[];
  objectID: string;
  _highlightResult: HighlightResult;
}

export interface HighlightResult {
  title: Title;
  playerId?: Title;
  playerName?: Title[];
}

export interface Title {
  value: string;
  matchLevel: string;
  fullyHighlighted?: boolean;
  matchedWords: string[];
}

export interface Highlight {
  contentTitle: string;
  contentText: string;
}

export interface ProcessingTimingsMS {
  _request: Request;
  total: number;
}

export interface Request {
  roundTrip: number;
}

export interface ProspectBio {
  contentTitle: string;
  contentText: string;
}

export default PlayerSearchResponse;
