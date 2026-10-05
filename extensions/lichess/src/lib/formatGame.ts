import type { LichessColor, LichessGame, LichessPlayer, RecentGameViewModel } from "../types/lichess";
import { fenFromPgn } from "./chess";
import { gameUrl } from "./lichessUrls";

export function toRecentGameViewModel(game: LichessGame, username: string): RecentGameViewModel {
  const userColor = getPlayerColor(game, username);
  const opponentColor: LichessColor = userColor === "white" ? "black" : "white";
  const white = game.players.white;
  const black = game.players.black;
  const dateTime = new Date(game.createdAt);

  return {
    id: game.id,
    opponent: playerName(game.players[opponentColor]),
    result: resultFor(game, userColor),
    whiteName: playerName(white),
    blackName: playerName(black),
    whiteElo: rating(white),
    blackElo: rating(black),
    speed: formatSpeed(game.speed),
    date: formatDate(dateTime),
    dateTime,
    url: gameUrl(game.id),
    pgn: game.pgn ?? "",
    fen: fenFromPgn(game.pgn),
    status: formatStatus(game.status),
  };
}

function getPlayerColor(game: LichessGame, username: string): LichessColor {
  const normalizedUsername = username.trim().toLowerCase();
  const whiteId = game.players.white.user?.id?.toLowerCase();
  const whiteName = game.players.white.user?.name?.toLowerCase();

  if (whiteId === normalizedUsername || whiteName === normalizedUsername) {
    return "white";
  }

  return "black";
}

function resultFor(game: LichessGame, userColor: LichessColor): RecentGameViewModel["result"] {
  if (!game.winner) {
    return "draw";
  }

  return game.winner === userColor ? "win" : "loss";
}

function playerName(player: LichessPlayer): string {
  return player.user?.name ?? "Anonymous";
}

function rating(player: LichessPlayer): string {
  return player.rating ? String(player.rating) : "Unrated";
}

function formatSpeed(speed: string): string {
  const labels: Record<string, string> = {
    ultraBullet: "UltraBullet",
    bullet: "Bullet",
    blitz: "Blitz",
    rapid: "Rapid",
    classical: "Classical",
    correspondence: "Correspondence",
  };

  return labels[speed] ?? speed;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    mate: "Checkmate",
    resign: "Resignation",
    stalemate: "Stalemate",
    timeout: "Timeout",
    draw: "Draw",
    outoftime: "Out of time",
    aborted: "Aborted",
    cheat: "Fair play",
    variantEnd: "Variant end",
  };

  return labels[status] ?? status;
}
