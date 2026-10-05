import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { fenFromPgn, parseChessInput, parseFen, parsePgn } from "../src/lib/chess";
import { toRecentGameViewModel } from "../src/lib/formatGame";
import {
  analysisUrlForChessInput,
  analysisUrlForFen,
  analysisUrlForPgn,
  analysisUrlForPgnMoves,
  createGameUrl,
  gameUrl,
} from "../src/lib/lichessUrls";
import { estimatedDurationSeconds, isSupportedRealtimeSeekClock, parseClockValue } from "../src/lib/timeControl";
import type { LichessGame } from "../src/types/lichess";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const SHORT_PGN = "1. e4 e5 2. Nf3 Nc6";
const SHORT_PGN_FEN = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";
const SETUP_PGN = `[SetUp "1"]
[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]

1... e5 2. Nf3`;
const SETUP_PGN_FEN = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";

describe("chess parsing", () => {
  test("parses and normalizes a valid FEN", () => {
    assert.equal(parseFen(` ${STARTING_FEN.replaceAll(" ", "  ")} `), STARTING_FEN);
  });

  test("rejects invalid FEN input", () => {
    assert.equal(parseFen("not a fen"), undefined);
  });

  test("parses PGN and exposes the final FEN", () => {
    const parsed = parsePgn(SHORT_PGN);

    assert.equal(parsed?.fen, SHORT_PGN_FEN);
    assert.equal(parsed?.moveText, "e4 e5 Nf3 Nc6");
    assert.equal(parsed?.hasSetupFen, false);
    assert.equal(parsed?.ply, 4);
    assert.equal(fenFromPgn(SHORT_PGN), SHORT_PGN_FEN);
  });

  test("keeps track of PGN setup positions", () => {
    const parsed = parsePgn(SETUP_PGN);

    assert.equal(parsed?.fen, SETUP_PGN_FEN);
    assert.equal(parsed?.moveText, "e5 Nf3");
    assert.equal(parsed?.hasSetupFen, true);
    assert.equal(parsed?.ply, 2);
  });

  test("detects whether chess input is FEN or PGN", () => {
    assert.equal(parseChessInput(STARTING_FEN)?.type, "fen");
    assert.equal(parseChessInput(SHORT_PGN)?.type, "pgn");
    assert.equal(parseChessInput(""), undefined);
  });
});

describe("lichess URLs", () => {
  test("builds game and new game URLs", () => {
    assert.equal(gameUrl("kSKlV0i6"), "https://lichess.org/kSKlV0i6");
    assert.equal(createGameUrl(), "https://lichess.org/?any#hook");
  });

  test("builds analysis URLs for FEN and PGN moves", () => {
    assert.equal(
      analysisUrlForFen(STARTING_FEN),
      "https://lichess.org/analysis/standard/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1",
    );
    assert.equal(analysisUrlForPgnMoves("e4 e5 Nf3+ Nc6#", 4), "https://lichess.org/analysis/pgn/e4_e5_Nf3_Nc6#4");
  });

  test("builds analysis URLs for full PGNs", () => {
    assert.equal(analysisUrlForPgn(SHORT_PGN, 4), "https://lichess.org/analysis/pgn/1.%20e4%20e5%202.%20Nf3%20Nc6#4");
  });

  test("preserves move history for PGNs with setup positions", () => {
    const parsed = parseChessInput(SETUP_PGN);

    assert.ok(parsed);
    assert.equal(parsed.type, "pgn");
    assert.equal(analysisUrlForChessInput(parsed), analysisUrlForPgn(parsed.pgn, parsed.ply));
    assert.match(
      analysisUrlForChessInput(parsed),
      /^https:\/\/lichess\.org\/analysis\/pgn\/%5BEvent%20%22%3F%22%5D.*%5BSetUp%20%221%22%5D.*%5BFEN%20%22rnbqkbnr%2Fpppppppp.*1\.%20\.{3}%20e5%202\.%20Nf3%20\*#2$/s,
    );
  });
});

describe("time controls", () => {
  test("parses integer clock values in the Lichess API range", () => {
    assert.equal(parseClockValue("3"), 3);
    assert.equal(parseClockValue("2"), 2);
    assert.equal(parseClockValue("3.5"), undefined);
    assert.equal(parseClockValue("-1"), undefined);
    assert.equal(parseClockValue("181"), undefined);
  });

  test("accepts only rapid or classical realtime board seeks", () => {
    assert.equal(estimatedDurationSeconds({ time: 3, increment: 2 }), 260);
    assert.equal(isSupportedRealtimeSeekClock({ time: 3, increment: 2 }), false);
    assert.equal(isSupportedRealtimeSeekClock({ time: 8, increment: 0 }), true);
    assert.equal(isSupportedRealtimeSeekClock({ time: 5, increment: 5 }), true);
  });
});

describe("recent game formatting", () => {
  test("formats a recent game from the current user's perspective", () => {
    const viewModel = toRecentGameViewModel(createGameFixture(), "Alice");

    assert.equal(viewModel.id, "abc123");
    assert.equal(viewModel.opponent, "Bob");
    assert.equal(viewModel.result, "win");
    assert.equal(viewModel.whiteElo, "1600");
    assert.equal(viewModel.blackElo, "1500");
    assert.equal(viewModel.speed, "Rapid");
    assert.equal(viewModel.status, "Checkmate");
    assert.equal(viewModel.url, "https://lichess.org/abc123");
    assert.equal(viewModel.fen, SHORT_PGN_FEN);
  });
});

function createGameFixture(): LichessGame {
  return {
    id: "abc123",
    rated: true,
    variant: "standard",
    speed: "rapid",
    createdAt: Date.UTC(2026, 0, 1, 12),
    status: "mate",
    winner: "white",
    pgn: SHORT_PGN,
    players: {
      white: {
        user: {
          id: "alice",
          name: "Alice",
        },
        rating: 1600,
      },
      black: {
        user: {
          id: "bob",
          name: "Bob",
        },
        rating: 1500,
      },
    },
  };
}
