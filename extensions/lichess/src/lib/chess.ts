import { Chess } from "chess.js";

const FEN_FIELDS = 6;

export type ChessInput =
  | {
      type: "fen";
      value: string;
      fen: string;
      pgn?: never;
    }
  | {
      type: "pgn";
      value: string;
      fen: string;
      pgn: string;
      moveText: string;
      hasSetupFen: boolean;
      ply: number;
    };

export function parseChessInput(input: string): ChessInput | undefined {
  const value = input.trim();

  if (!value) {
    return undefined;
  }

  const fen = parseFen(value);
  if (fen) {
    return { type: "fen", value, fen };
  }

  const parsedPgn = parsePgn(value);
  if (parsedPgn) {
    return { type: "pgn", value, ...parsedPgn };
  }

  return undefined;
}

export function parseFen(input: string): string | undefined {
  const normalized = input.trim().replace(/\s+/g, " ");

  if (normalized.split(" ").length !== FEN_FIELDS) {
    return undefined;
  }

  try {
    new Chess(normalized);
    return normalized;
  } catch {
    return undefined;
  }
}

export function parsePgn(
  input: string,
): { fen: string; pgn: string; moveText: string; hasSetupFen: boolean; ply: number } | undefined {
  const chess = new Chess();

  try {
    chess.loadPgn(input.trim(), { strict: false });
  } catch {
    return undefined;
  }

  const history = chess.history();
  const headers = chess.getHeaders();

  if (history.length === 0) {
    return undefined;
  }

  return {
    fen: chess.fen(),
    pgn: chess.pgn(),
    moveText: history.join(" "),
    hasSetupFen: headers.SetUp === "1" && typeof headers.FEN === "string",
    ply: history.length,
  };
}

export function fenFromPgn(pgn: string | undefined): string {
  if (!pgn) {
    return "";
  }

  return parsePgn(pgn)?.fen ?? "";
}
