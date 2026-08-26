import type { ChessInput } from "./chess";

const LICHESS_BASE_URL = "https://lichess.org";

export function gameUrl(gameId: string): string {
  return `${LICHESS_BASE_URL}/${gameId}`;
}

export function createGameUrl(): string {
  return `${LICHESS_BASE_URL}/?any#hook`;
}

export function analysisUrlForFen(fen: string): string {
  return `${LICHESS_BASE_URL}/analysis/standard/${fen.trim().replace(/\s+/g, "_")}`;
}

export function analysisUrlForChessInput(input: ChessInput): string {
  if (input.type === "fen" || input.hasSetupFen) {
    return analysisUrlForFen(input.fen);
  }

  return analysisUrlForPgnMoves(input.moveText, input.ply);
}

export function analysisUrlForPgnMoves(moveText: string, ply?: number): string {
  const path = moveText
    .trim()
    .split(/\s+/)
    .map((move) => move.replace(/[+#]+$/g, ""))
    .join("_");
  const hash = ply && ply > 0 ? `#${ply}` : "";

  return `${LICHESS_BASE_URL}/analysis/pgn/${path}${hash}`;
}
