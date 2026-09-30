export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard';

export type Problem = {
  difficulty: ProblemDifficulty;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  likes: number;
  dislikes: number;
  content: string;
  isPaidOnly: boolean;
  stats: string;
  topicTags: {
    name: string;
  };
  codeSnippets: CodeSnippet[];
};

export type ProblemStats = {
  totalAccepted: string;
  totalSubmission: string;
  acRate: string;
};

export type ProblemPreview = Pick<
  Problem,
  'difficulty' | 'questionFrontendId' | 'title' | 'titleSlug' | 'isPaidOnly' | 'stats' | 'codeSnippets'
>;

export type DailyChallenge = {
  date: string;
  link: string;
  problem: Problem;
};

export type CodeSnippet = {
  lang: string;
  langSlug: string;
  code: string;
};

export type GraphQLResponse<T> = { data: T };

export type DailyChallengeResponse = GraphQLResponse<{
  dailyChallenge: DailyChallenge;
}>;

export type SearchProblemResponse = GraphQLResponse<{
  problemsetQuestionList: {
    total: number;
    data: ProblemPreview[];
  } | null;
}>;

export type GetProblemResponse = GraphQLResponse<{
  problem: Problem;
}>;

export type PotdProblem = {
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: ProblemDifficulty;
};

export type PotdStatusResponse = GraphQLResponse<{
  dailyChallenge: { date: string; link: string; problem: PotdProblem } | null;
  // Absent when queried without a username (daily-only lite query).
  recentAcSubmissionList?: { titleSlug: string; timestamp: string }[];
}>;

export type RecentDifficultyResponse = GraphQLResponse<
  Record<string, { titleSlug: string; difficulty: ProblemDifficulty } | null>
>;

export type SubmissionCount = {
  difficulty: string;
  count: number;
  submissions: number;
};

export type UserCalendar = {
  streak: number;
  totalActiveDays: number;
  activeYears: number[];
  submissionCalendar: string; // JSON string: { [unixTimestamp]: count }
};

export type Badge = {
  id: string;
  displayName: string;
  icon: string;
};

export type MatchedUser = {
  username: string;
  githubUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  profile: {
    realName: string | null;
    userAvatar: string | null;
    aboutMe: string | null;
    countryName: string | null;
    company: string | null;
    school: string | null;
    ranking: number | null;
    reputation: number | null;
    starRating: number | null;
  };
  submitStats: {
    acSubmissionNum: SubmissionCount[];
    totalSubmissionNum: SubmissionCount[];
  };
  badges: Badge[];
  userCalendar: UserCalendar | null;
};

export type ContestRanking = {
  attendedContestsCount: number;
  rating: number;
  globalRanking: number | null;
  totalParticipants: number | null;
  topPercentage: number | null;
  badge: { name: string } | null;
} | null;

export type RecentSubmission = {
  id: string;
  title: string;
  titleSlug: string;
  timestamp: string; // unix seconds, as string
};

export type UserProfileData = {
  matchedUser: MatchedUser | null;
  userContestRanking: ContestRanking;
  recentAcSubmissionList: RecentSubmission[];
};

export type UserProfileResponse = GraphQLResponse<UserProfileData>;
