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
      codeSnippets {
        lang
        langSlug
        code
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
    total: totalNum
    data {
      difficulty
      questionFrontendId
      isPaidOnly
      title
      titleSlug
      stats
      codeSnippets {
        lang
        langSlug
        code
      }
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
    codeSnippets {
      lang
      langSlug
      code
    }
  }
}
`;
