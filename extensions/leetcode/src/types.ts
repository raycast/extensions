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
};

export type ProblemStats = {
  totalAccepted: string;
  totalSubmission: string;
  acRate: string;
};

export type ProblemPreview = Pick<
  Problem,
  'difficulty' | 'questionFrontendId' | 'title' | 'titleSlug' | 'isPaidOnly' | 'stats'
>;

export type DailyChallenge = {
  date: string;
  link: string;
  problem: Problem;
};

export type GraphQLResponse<T> = { data: T };

export type DailyChallengeResponse = GraphQLResponse<{
  dailyChallenge: DailyChallenge;
}>;

export type SearchProblemResponse = GraphQLResponse<{
  problemsetQuestionList: {
    problems: ProblemPreview[];
  } | null;
}>;

export type GetProblemResponse = GraphQLResponse<{
  problem: Problem;
}>;
