// Product Hunt GraphQL API v2 query strings and typed response shapes.
// Public schema only: posts/post, thumbnail{url}, votesCount, user/makers, media, topics.
// Do NOT reuse scraper-only field names (homefeed, latestScore, thumbnailImageUuid, hunter).

export const FEATURED_POSTS_QUERY = /* GraphQL */ `
  query FeaturedPosts($first: Int!, $postedAfter: DateTime) {
    posts(first: $first, featured: true, postedAfter: $postedAfter, order: VOTES) {
      edges {
        node {
          id
          name
          tagline
          description
          slug
          url
          votesCount
          commentsCount
          isVoted
          createdAt
          featuredAt
          thumbnail {
            url(width: 1024, height: 512)
          }
          user {
            id
            name
            username
            url
            profileImage
          }
          makers {
            id
            name
            username
            url
            profileImage
          }
          topics(first: 8) {
            edges {
              node {
                id
                name
                slug
                followersCount
              }
            }
          }
        }
      }
    }
  }
`;

export const POST_DETAIL_QUERY = /* GraphQL */ `
  query PostDetail($slug: String!) {
    post(slug: $slug) {
      id
      name
      tagline
      description
      slug
      url
      website
      votesCount
      commentsCount
      isVoted
      reviewsCount
      reviewsRating
      dailyRank
      weeklyRank
      monthlyRank
      yearlyRank
      makerReplies
      createdAt
      featuredAt
      thumbnail {
        url(width: 1200, height: 800)
        videoUrl
        type
      }
      media {
        url(width: 1200, height: 800)
        videoUrl
        type
      }
      productLinks {
        type
        url
      }
      user {
        id
        name
        username
        url
        profileImage
        headline
        twitterUsername
        websiteUrl
      }
      makers {
        id
        name
        username
        url
        profileImage
        headline
        twitterUsername
        websiteUrl
      }
      topics(first: 20) {
        edges {
          node {
            id
            name
            slug
            description
            followersCount
          }
        }
      }
    }
  }
`;

export interface ApiUser {
  id: string;
  name: string;
  username: string;
  url: string;
  profileImage?: string;
  headline?: string;
  twitterUsername?: string;
  websiteUrl?: string;
}

export interface ApiTopicEdge {
  node: { id: string; name: string; slug: string; description?: string; followersCount?: number | null };
}

export interface ApiMedia {
  url: string;
  videoUrl?: string;
  type: string;
}

export interface ApiPostNode {
  id: string;
  name: string;
  tagline: string;
  description?: string;
  slug: string;
  url: string;
  website?: string; // String! in schema, but absent from FEATURED_POSTS_QUERY which shares this type
  votesCount: number;
  commentsCount: number;
  isVoted?: boolean | null;
  reviewsCount?: number | null;
  reviewsRating?: number | null;
  dailyRank?: number | null;
  weeklyRank?: number | null;
  monthlyRank?: number | null;
  yearlyRank?: number | null;
  makerReplies?: number | null;
  createdAt: string;
  featuredAt?: string;
  thumbnail?: { url: string };
  media?: ApiMedia[];
  productLinks?: Array<{ type: string; url: string }>;
  user?: ApiUser;
  makers?: ApiUser[];
  topics?: { edges: ApiTopicEdge[] };
}

export interface FeaturedPostsResponse {
  posts: { edges: Array<{ node: ApiPostNode }> };
}

export interface PostDetailResponse {
  post: ApiPostNode | null;
}
