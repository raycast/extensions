/**
 * Codeforces API Type Definitions
 * @fileoverview Complete TypeScript type definitions for the Codeforces API.
 * @see https://codeforces.com/apiHelp
 * @version 1.0.0
 * @date 2025-12-21
 *
 * ## General Notes
 *
 * - **Base URL**: `https://codeforces.com/api/`
 * - **Rate Limit**: Maximum 1 request per 2 seconds
 * - **Timestamps**: All timestamp fields are Unix timestamps in seconds (UTC)
 * - **Localization**: Use `lang=en` or `lang=ru` parameter for language preference
 * - **Multiple Values**: Handles and other lists are semicolon-separated (e.g., `tourist;Um_nik`)
 */

// ============================================================================
// Literal Types
// ============================================================================

/** Submission verdict types. */
export type SubmissionVerdict =
  | "FAILED"
  | "OK"
  | "PARTIAL"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "IDLENESS_LIMIT_EXCEEDED"
  | "SECURITY_VIOLATED"
  | "CRASHED"
  | "INPUT_PREPARATION_CRASHED"
  | "CHALLENGED"
  | "SKIPPED"
  | "TESTING"
  | "REJECTED"
  | "SUBMITTED";

/** Contest phase. */
export type ContestPhase = "BEFORE" | "CODING" | "PENDING_SYSTEM_TEST" | "SYSTEM_TEST" | "FINISHED";

/** Contest type. */
export type ContestType = "CF" | "IOI" | "ICPC";

/** Participant type in a contest. */
export type ParticipantType = "CONTESTANT" | "PRACTICE" | "VIRTUAL" | "MANAGER" | "OUT_OF_COMPETITION";

/** Hack verdict. */
export type HackVerdict =
  | "HACK_SUCCESSFUL"
  | "HACK_UNSUCCESSFUL"
  | "INVALID_INPUT"
  | "GENERATOR_INCOMPILABLE"
  | "GENERATOR_CRASHED"
  | "IGNORED"
  | "TESTING"
  | "OTHER";

/** Problem result type. */
export type ProblemResultType = "PRELIMINARY" | "FINAL";

// ============================================================================
// Core API Response
// ============================================================================

/**
 * Base response structure for all Codeforces API calls.
 * Each method call returns a JSON-object with three possible fields: status, comment and result.
 *
 * @template T - The type of the result data
 * @example
 * ```typescript
 * const response: ApiResponse<User[]> = await fetch('https://codeforces.com/api/user.info?handles=tourist')
 *   .then(r => r.json());
 * if (response.status === 'OK') {
 *   console.log(response.result);
 * }
 * ```
 */
export interface ApiResponse<T> {
  /** Status of the API call ('OK' or 'FAILED'). */
  status: "OK" | "FAILED";
  /** Result data (only present if status is 'OK'). */
  result?: T;
  /** Comment explaining the response (typically present if status is 'FAILED'). */
  comment?: string;
}

// ============================================================================
// Data Objects
// ============================================================================

/**
 * Represents a Codeforces user.
 *
 * @example
 * ```typescript
 * const user: User = {
 *   handle: 'tourist',
 *   rating: 3800,
 *   maxRating: 3979,
 *   rank: 'legendary grandmaster'
 * };
 * ```
 */
export interface User {
  handle: string;
  email?: string;
  vkId?: string;
  openId?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  city?: string;
  organization?: string;
  contribution: number;
  rank?: string;
  rating?: number;
  maxRank?: string;
  maxRating?: number;
  lastOnlineTimeSeconds: number;
  registrationTimeSeconds: number;
  friendOfCount: number;
  avatar?: string;
  titlePhoto?: string;
}

/**
 * Default/initial user data object.
 *
 * @example
 * ```typescript
 * const [user, setUser] = useState<User>(initialUserData);
 * ```
 */
export const initialUserData: User = {
  handle: "",
  firstName: "",
  lastName: "",
  rating: 0,
  maxRating: 0,
  rank: "",
  maxRank: "",
  friendOfCount: 0,
  organization: "",
  lastOnlineTimeSeconds: 0,
  registrationTimeSeconds: 0,
  titlePhoto: "https://userpic.codeforces.org/no-title.jpg",
  country: "",
  city: "",
  avatar: "",
  contribution: 0,
};

/** Represents a blog entry. May be in short or full version. */
export interface BlogEntry {
  id: number;
  originalLocale: string;
  creationTimeSeconds: number;
  authorHandle: string;
  title: string;
  content?: string;
  locale: string;
  modificationTimeSeconds: number;
  allowViewHistory: boolean;
  tags: string[];
  rating: number;
}

/** Represents a comment on a blog entry. */
export interface Comment {
  id: number;
  creationTimeSeconds: number;
  commentatorHandle: string;
  locale: string;
  text: string;
  parentCommentId?: number;
  rating: number;
}

/** Represents a recent action (blog entry or comment). */
export interface RecentAction {
  timeSeconds: number;
  blogEntry?: BlogEntry;
  comment?: Comment;
}

/** Represents a user's rating change in a contest. */
export interface RatingChange {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

/** Represents a contest. */
export interface Contest {
  id: number;
  name: string;
  type: ContestType;
  phase: ContestPhase;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds?: number;
  relativeTimeSeconds?: number;
  preparedBy?: string;
  websiteUrl?: string;
  description?: string;
  difficulty?: number;
  kind?: string;
  icpcRegion?: string;
  country?: string;
  city?: string;
  season?: string;
}

/** Represents a party (contestant or team) in a contest. */
export interface Party {
  contestId?: number;
  members: Member[];
  participantType: ParticipantType;
  teamId?: number;
  teamName?: string;
  ghost: boolean;
  room?: number;
  startTimeSeconds?: number;
}

/** Represents a member of a party. */
export interface Member {
  handle: string;
  name?: string;
}

/** Represents a problem. */
export interface Problem {
  contestId?: number;
  problemsetName?: string;
  index: string;
  name: string;
  type: string;
  points?: number;
  rating?: number;
  tags: string[];
}

/** Represents statistics about a problem. */
export interface ProblemStatistics {
  contestId?: number;
  index: string;
  solvedCount: number;
}

/** Represents a submission. */
export interface Submission {
  id: number;
  contestId?: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: Problem;
  author: Party;
  programmingLanguage: string;
  verdict?: SubmissionVerdict;
  testset: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

/** Represents a hack during a contest. */
export interface Hack {
  id: number;
  creationTimeSeconds: number;
  hacker: Party;
  defender: Party;
  verdict?: HackVerdict;
  problem: Problem;
  test?: string;
  judgeProtocol?: JudgeProtocol;
}

/** Represents the judging protocol for a hack. */
export interface JudgeProtocol {
  manual: string;
  protocol: string;
  verdict: string;
}

/** Represents a ranklist row in contest standings. */
export interface RanklistRow {
  party: Party;
  rank: number;
  points: number;
  penalty: number;
  successfulHackCount: number;
  unsuccessfulHackCount: number;
  problemResults: ProblemResult[];
  lastSubmissionTimeSeconds?: number;
}

/** Represents a submission result for a problem. */
export interface ProblemResult {
  points: number;
  penalty?: number;
  rejectedAttemptCount: number;
  type: ProblemResultType;
  bestSubmissionTimeSeconds?: number;
}

/**
 * Represents contest standings.
 *
 * @example
 * ```typescript
 * const response = await fetch('https://codeforces.com/api/contest.standings?contestId=566')
 *   .then(r => r.json()) as ContestStandingsResponse;
 * if (response.status === 'OK' && response.result) {
 *   const { contest, problems, rows } = response.result;
 * }
 * ```
 */
export interface ContestStandings {
  contest: Contest;
  problems: Problem[];
  rows: RanklistRow[];
}

/** Represents a problem set with statistics. */
export interface Problemset {
  problems: Problem[];
  problemStatistics: ProblemStatistics[];
}

// ============================================================================
// API Response Types
// ============================================================================

export type BlogEntryCommentsResponse = ApiResponse<Comment[]>;
export type BlogEntryViewResponse = ApiResponse<BlogEntry>;
export type ContestHacksResponse = ApiResponse<Hack[]>;
export type ContestListResponse = ApiResponse<Contest[]>;
export type ContestRatingChangesResponse = ApiResponse<RatingChange[]>;
export type ContestStandingsResponse = ApiResponse<ContestStandings>;
export type ContestStatusResponse = ApiResponse<Submission[]>;
export type ProblemsetProblemsResponse = ApiResponse<Problemset>;
export type ProblemsetRecentStatusResponse = ApiResponse<Submission[]>;
export type RecentActionsResponse = ApiResponse<RecentAction[]>;
export type UserBlogEntriesResponse = ApiResponse<BlogEntry[]>;
export type UserFriendsResponse = ApiResponse<string[]>;
export type UserInfoResponse = ApiResponse<User[]>;
export type UserRatedListResponse = ApiResponse<User[]>;
export type UserRatingResponse = ApiResponse<RatingChange[]>;
export type UserStatusResponse = ApiResponse<Submission[]>;
