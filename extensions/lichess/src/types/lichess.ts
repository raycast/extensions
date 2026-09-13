export type LichessColor = "white" | "black";

export type LichessSpeed = "ultraBullet" | "bullet" | "blitz" | "rapid" | "classical" | "correspondence" | string;

export interface LichessUser {
  id?: string;
  name?: string;
  title?: string;
}

export interface LichessPlayer {
  user?: LichessUser;
  rating?: number;
  ratingDiff?: number;
}

export interface LichessClock {
  initial: number;
  increment: number;
  totalTime?: number;
}

export interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: LichessSpeed;
  perf?: string;
  createdAt: number;
  lastMoveAt?: number;
  status: string;
  players: Record<LichessColor, LichessPlayer>;
  winner?: LichessColor;
  moves?: string;
  pgn?: string;
  clock?: LichessClock;
}

export interface RecentGameViewModel {
  id: string;
  opponent: string;
  result: "win" | "loss" | "draw";
  whiteName: string;
  blackName: string;
  whiteElo: string;
  blackElo: string;
  speed: string;
  date: string;
  dateTime: Date;
  url: string;
  pgn: string;
  fen: string;
  status: string;
}
