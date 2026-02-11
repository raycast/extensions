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
