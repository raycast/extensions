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

// Lightweight daily-challenge query for the menu bar (no content/snippets).
export const dailyChallengeLiteQuery = `
query dailyChallengeLite {
  dailyChallenge: activeDailyCodingChallengeQuestion {
    date
    link
    problem: question {
      questionFrontendId
      title
      titleSlug
      difficulty
    }
  }
}
`;

// Daily challenge + the user's recent accepted submissions, used by the menu
// bar to tell whether today's problem has been solved (cookie-less).
export const potdStatusQuery = `
query potdStatus($username: String!, $limit: Int) {
  dailyChallenge: activeDailyCodingChallengeQuestion {
    date
    link
    problem: question {
      questionFrontendId
      title
      titleSlug
      difficulty
    }
  }
  recentAcSubmissionList(username: $username, limit: $limit) {
    titleSlug
    timestamp
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

// Builds a single batched query that fetches the difficulty for many problems
// at once by aliasing repeated `question` fields (q0, q1, ...). The recent
// submissions endpoint doesn't return difficulty, so we look it up per slug.
export const buildRecentDifficultyQuery = (titleSlugs: string[]): string => {
  const fields = titleSlugs
    .map((slug, i) => `q${i}: question(titleSlug: ${JSON.stringify(slug)}) { titleSlug difficulty }`)
    .join('\n  ');
  return `query recentDifficulties {\n  ${fields}\n}`;
};

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

export const userProfileQuery = `
query userProfile($username: String!, $year: Int) {
  matchedUser(username: $username) {
    username
    githubUrl
    twitterUrl
    linkedinUrl
    profile {
      realName
      userAvatar
      aboutMe
      countryName
      company
      school
      ranking
      reputation
      starRating
    }
    submitStats {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
      totalSubmissionNum {
        difficulty
        count
        submissions
      }
    }
    badges {
      id
      displayName
      icon
    }
    userCalendar(year: $year) {
      streak
      totalActiveDays
      activeYears
      submissionCalendar
    }
  }
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
    totalParticipants
    topPercentage
    badge {
      name
    }
  }
  recentAcSubmissionList(username: $username, limit: 15) {
    id
    title
    titleSlug
    timestamp
  }
}
`;
