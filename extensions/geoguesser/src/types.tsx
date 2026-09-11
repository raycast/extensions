export interface User {
  nick: string;
  created: string;
  isProUser: boolean;
  type: string;
  isVerified: boolean;
  pin: Pin;
  customImage: string | null;
  fullBodyPin: string;
  borderUrl: string;
  color: number;
  url: string;
  id: string;
  countryCode: string;
  br: BattleRoyale;
  streakProgress: Progress;
  explorerProgress: Progress;
  dailyChallengeProgress: number;
  lastClaimedLevel: number;
  progress: UserProgress;
  competitive: Competitive;
  lastNameChange: string;
  lastNickOrCountryChange: string;
  isBanned: boolean;
  chatBan: boolean;
  nameChangeAvailableAt: string | null;
  avatar: Avatar;
  isBotUser: boolean;
  suspendedUntil: string | null;
  wallet: number | null;
  flair: number;
  isCreator: boolean;
  isAppAnonymous: boolean;
}

export interface UserProgress {
  xp: number;
  level: number;
  levelXp: number;
  nextLevel: number;
  nextLevelXp: number;
  title: Title;
  competitionMedals: Progress;
}

export interface ProfileResponse {
  user: User;
  playingRestriction: PlayingRestriction;
  email: string;
  isEmailChangeable: boolean;
  isEmailVerified: boolean;
  emailNotificationSettings: EmailNotificationSettings;
  isBanned: boolean;
  chatBan: boolean;
  distanceUnit: number;
  dateFormat: number;
  hideCustomAvatars: boolean;
  shareActivities: boolean;
  deviceToken: string;
}

export interface StatsResponse {
  gamesPlayed: number;
  roundsPlayed: number;
  maxGameScore: ScoreStats;
  averageGameScore: ScoreStats;
  maxRoundScore: ScoreStats;
  streakGamesPlayed: number;
  closestDistance: DistanceStats;
  averageDistance: DistanceStats;
  averageTime: string;
  timedOutGuesses: number;
  battleRoyaleStats: BattleRoyaleStat[];
  dailyChallengeStreak: number;
  dailyChallengeCurrentStreak: number;
  dailyChallengesRolling7Days: DailyChallengeDay[];
  dailyChallengeMedal: number;
  streakMedals: StreakMedal[];
  streakRecords: StreakRecord[];
}

export interface ScoreStats {
  amount: string;
  unit: string;
  percentage: number;
}

export interface DistanceStats {
  meters: {
    amount: string;
    unit: string;
  };
  miles: {
    amount: string;
    unit: string;
  };
}

export interface BattleRoyaleStat {
  key: string;
  value: {
    gamesPlayed: number;
    wins: number;
    averagePosition: number;
  };
}

export interface DailyChallengeDay {
  date: string;
  challengeToken: string;
  totalScore: number;
  bestRoundScore: number;
  totalTime: number;
  longestTime: number;
  shortestTime: number;
  closestDistance: number;
  totalDistance: number;
}

export interface StreakMedal {
  key: string;
  value: number;
}

export interface StreakRecord {
  key: string;
  value: {
    maxStreak: number;
    maxStreakDate: string;
  };
}

export interface Pin {
  url: string;
  anchor: string;
  isDefault: boolean;
}

export interface BattleRoyale {
  level: number;
  division: number;
}

export interface Progress {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

export interface Title {
  id: number;
  tierId: number;
}

export interface Competitive {
  elo: number;
  rating: number;
  lastRatingChange: number;
  division: Division;
  onLeaderboard: boolean;
}

export interface Division {
  type: number;
  startRating: number;
  endRating: number;
}

export interface Avatar {
  fullBodyPath: string;
}

export interface PlayingRestriction {
  restriction: number;
  canPlayGame: boolean;
  canHostParty: boolean;
  description: string;
  ticket: string | null;
  periodicAllowanceMetadata: string | null;
  noRestrictionEndsAt: string | null;
}

export interface EmailNotificationSettings {
  sendDailyChallengeNotifications: boolean;
  sendDailyGameNotifications: boolean;
  sendChallengeNotifications: boolean;
  sendNewsNotifications: boolean;
  sendPromotionalNotifications: boolean;
  sendSocialNotifications: boolean;
  sendCompetitiveNotifications: boolean;
  unsubscribeToken: string | null;
}

export interface DailyChallengeResponse {
  token: string;
  date: string;
  description: string | null;
  participants: number;
  leaderboard: LeaderboardEntry[];
  authorCreator: {
    id: string;
    name: string;
    avatarImage: string;
  };
  pickedWinner: boolean;
  friends: unknown;
  country: unknown[];
}

export interface LeaderboardEntry {
  id: string;
  nick: string;
  pinUrl: string;
  totalScore: number;
  totalTime: number;
  totalDistance: number;
  countryCode: string;
  currentStreak: number;
  isVerified: boolean;
  flair: number;
}

export interface MyDailyChallengeScore {
  id: string;
  nick: string;
  pinUrl: string;
  totalScore: number;
  totalTime: number;
  totalDistance: number;
  isOnLeaderboard: boolean;
  isVerified: boolean;
  flair: number;
  countryCode: string;
  currentStreak: number;
  totalStepsCount: number | null;
}

export interface FeedEntry {
  type: number;
  time: string;
  user: {
    id: string;
    nick: string;
    isVerified: boolean;
    flair: number;
  };
  payload: string; // JSON string!
}

export interface FeedResponse {
  entries: FeedEntry[];
  paginationToken: string;
}

export interface DailyChallengePayload {
  mapSlug: string;
  mapName: string;
  points: number;
  challengeToken: string;
  gameMode: string;
  isDailyChallenge: boolean;
}

export interface GameDetails {
  token: string;
  type: string;
  mode: string;
  state: string;
  roundCount: number;
  timeLimit: number;
  forbidMoving: boolean;
  forbidZooming: boolean;
  forbidRotating: boolean;
  streakType: string;
  map: {
    id: string;
    name: string;
    slug: string;
  };
  mapName: string;
  player: {
    totalScore: {
      amount: number;
      unit: string;
      percentage: number;
    };
    guesses: GameGuess[];
    id: string;
    nick: string;
    isVerified: boolean;
  };
  rounds: GameRound[];
  created: string;
}

export interface GameRound {
  lat: number;
  lng: number;
  panoId: string;
  heading: number;
  pitch: number;
  zoom: number;
  countryCode?: string;
}

export interface GameGuess {
  lat: number;
  lng: number;
  roundScore: {
    amount: number;
    unit: string;
    percentage: number;
  };
  distance: {
    amount: number;
    unit: string;
  };
  time: number;
  timedOut: boolean;
  timedOutWithGuess: boolean;
}

export interface StreakPayload {
  type: number;
  time: string;
  payload: {
    mapSlug: string;
    points: number;
    gameToken: string;
    gameMode: string;
  };
}

export interface DuelPayload {
  gameId: string;
  gameMode: string;
  competitiveGameMode: string;
}

export interface DuelDetails {
  id: string;
  teams: DuelTeam[];
  rounds: DuelRound[];
  currentRoundNumber: number;
  status: string;
  result: {
    isDraw: boolean;
    winningTeamId: string;
    winnerStyle: string;
  };
  options: {
    initialHealth: number;
    roundTime: number;
    movementOptions: {
      forbidMoving: boolean;
      forbidZooming: boolean;
      forbidRotating: boolean;
    };
    map: {
      name: string;
      slug: string;
    };
    isTeamDuels: boolean;
    competitiveGameMode: string;
  };
  movementOptions: {
    forbidMoving: boolean;
    forbidZooming: boolean;
    forbidRotating: boolean;
  };
}

export interface DuelTeam {
  id: string;
  name: string;
  health: number;
  players: DuelPlayer[];
  roundResults: DuelRoundResult[];
  isMultiplierActive: boolean;
  currentMultiplier: number;
}

export interface DuelPlayer {
  playerId: string;
  guesses: DuelGuess[];
  rating: number;
  countryCode: string;
  progressChange: {
    rankedTeamDuelsProgress: {
      ratingBefore: number;
      ratingAfter: number;
      winStreak: number;
    };
  };
}

export interface DuelGuess {
  roundNumber: number;
  lat: number;
  lng: number;
  distance: number;
  created: string;
  isTeamsBestGuessOnRound: boolean;
  score: number;
}

export interface DuelRoundResult {
  roundNumber: number;
  score: number;
  healthBefore: number;
  healthAfter: number;
  bestGuess: DuelGuess;
  damageDealt: number;
  multiplier: number;
}

export interface DuelRound {
  roundNumber: number;
  panorama: {
    panoId: string;
    lat: number;
    lng: number;
    countryCode: string;
  };
  multiplier: number;
}
