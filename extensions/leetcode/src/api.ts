export const endpoint = 'https://leetcode.com/graphql';

export const dailyChallengeQuery = `
query dailyChallenge {
  dailyChallenge: activeDailyCodingChallengeQuestion {
    date
    link
    problem: question {
      difficulty
      questionFrontendId
      title
      titleSlug
      likes
      dislikes
      content
      isPaidOnly
      stats
      topicTags {
        name
      }
    }
  }
}
`;

export const searchProblemQuery = `
query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    problems: data {
      difficulty
      questionFrontendId
      isPaidOnly
      title
      titleSlug
      stats
    }
  }
}
`;

export const getProblemQuery = `
query problem($titleSlug: String!) {
  problem: question(titleSlug: $titleSlug) {
    difficulty
    questionFrontendId
    title
    titleSlug
    likes
    dislikes
    content
    isPaidOnly
    stats
    topicTags {
      name
    }
  }
}
`;
