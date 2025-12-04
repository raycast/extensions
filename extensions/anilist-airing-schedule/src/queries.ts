export const ENDPOINT = 'https://graphql.anilist.co';

export const DEFAULT_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        hasNextPage
        perPage
        lastPage
      }
      media(status: RELEASING, type: ANIME, sort: POPULARITY_DESC) {
        id
        coverImage {
          extraLarge
          large
        }
        description
        externalLinks {
          id
          url
          site
          color
          type
        }
        nextAiringEpisode {
          episode
          airingAt
          timeUntilAiring
        }
        siteUrl
        status(version: 2)
        title {
          english
          romaji
        }
      }
    }
  }
`;

export const SEARCH_QUERY = `
  query ($page: Int, $perPage: Int, $search: String) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        hasNextPage
        perPage
        lastPage
      }
      media(search: $search, status_in: [NOT_YET_RELEASED, RELEASING], type: ANIME) {
        id
        status(version: 2)
        coverImage {
          extraLarge
          large
        }
        description
        externalLinks {
          url
          site
          color
          type
        }
        nextAiringEpisode {
          episode
          airingAt
          timeUntilAiring
        }
        siteUrl
        title {
          english
          romaji
        }
      }
    }
  }
`;
