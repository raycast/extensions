import { getPreferenceValues } from "@raycast/api";
import {
  Account,
  Channel,
  CreateIdeaInput,
  CreatePostInput,
  GetPostsOptions,
  GraphQLResponse,
  Idea,
  Organization,
  Post,
  PostsConnection,
  Preferences,
} from "./types";

const GRAPHQL_ENDPOINT = "https://api.buffer.com";

const ORGANIZATION_FIELDS = `
  id
  name
  ownerEmail
  channelCount
  members {
    totalCount
  }
  limits {
    channels
    members
    scheduledPosts
    scheduledThreadsPerChannel
    scheduledStoriesPerChannel
    generateContent
    tags
    ideas
    ideaGroups
    savedReplies
  }
`;

const ACCOUNT_FIELDS = `
  id
  email
  backupEmail
  avatar
  createdAt
  timezone
  name
  preferences {
    timeFormat
    startOfWeek
    defaultScheduleOption
  }
  connectedApps {
    clientId
    userId
    name
    description
    website
    createdAt
  }
  organizations {
    ${ORGANIZATION_FIELDS}
  }
`;

const CHANNEL_FIELDS = `
  id
  name
  displayName
  service
  avatar
  isDisconnected
  isLocked
  timezone
  isQueuePaused
  externalLink
  descriptor
  type
  organizationId
`;

const POST_FIELDS = `
  id
  ideaId
  status
  via
  schedulingType
  isCustomScheduled
  createdAt
  updatedAt
  dueAt
  sentAt
  text
  externalLink
  channelId
  channelService
  shareMode
  sharedNow
  assets {
    ... on ImageAsset {
      id
      type
      mimeType
      source
      thumbnail
    }
    ... on VideoAsset {
      id
      type
      mimeType
      source
      thumbnail
    }
    ... on DocumentAsset {
      id
      type
      mimeType
      source
      thumbnail
    }
  }
  channel {
    ${CHANNEL_FIELDS}
  }
`;

const IDEA_FIELDS = `
  id
  organizationId
  createdAt
  updatedAt
  content {
    title
    text
    services
    date
  }
`;

type MessageResult = {
  __typename: string;
  message?: string;
};

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const { accessToken } = getPreferenceValues<Preferences>();

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Buffer API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as GraphQLResponse<T>;

  if (json.errors?.length) {
    const msg = json.errors.map((error) => error.message).join("; ");
    throw new Error(`Buffer GraphQL error: ${msg}`);
  }

  if (!json.data) {
    throw new Error("Buffer API returned no data.");
  }

  return json.data;
}

function emptyPostsConnection(): PostsConnection {
  return {
    edges: [],
    pageInfo: {
      hasNextPage: false,
    },
  };
}

function buildPostMetadata(service?: string) {
  if (service?.toLowerCase() === "facebook") {
    return {
      facebook: {
        type: "post",
      },
    };
  }

  return undefined;
}

function buildAssets(input: CreatePostInput) {
  if (input.imageUrl && input.videoUrl) {
    throw new Error(
      "Choose either an image URL or a video URL for a post, not both.",
    );
  }

  if (input.imageUrl) {
    return {
      images: [{ url: input.imageUrl }],
    };
  }

  if (input.videoUrl) {
    return {
      videos: [
        {
          url: input.videoUrl,
          thumbnailUrl: input.videoThumbnailUrl,
        },
      ],
    };
  }

  return undefined;
}

function getMessageFromResult(
  result: MessageResult | null | undefined,
): string | undefined {
  if (!result) {
    return undefined;
  }

  return "message" in result ? result.message : undefined;
}

export async function getAccount(): Promise<Account> {
  const data = await gql<{ account: Account }>(`
    query GetAccount {
      account {
        ${ACCOUNT_FIELDS}
      }
    }
  `);

  return data.account;
}

export async function getOrganizations(): Promise<Organization[]> {
  const account = await getAccount();
  return account.organizations ?? [];
}

export async function getOrganization(
  organizationId: string,
): Promise<Organization> {
  const data = await gql<{
    account: {
      organizations: Organization[];
    };
  }>(
    `
    query GetOrganization($organizationId: String!) {
      account {
        organizations(filter: { organizationId: $organizationId }) {
          ${ORGANIZATION_FIELDS}
        }
      }
    }
  `,
    { organizationId },
  );

  const organization = data.account.organizations?.[0];
  if (!organization) {
    throw new Error(
      `Organization ${organizationId} was not found in this account.`,
    );
  }

  return organization;
}

export async function getChannels(organizationId: string): Promise<Channel[]> {
  const data = await gql<{ channels: Channel[] }>(
    `
    query GetChannels($organizationId: OrganizationId!) {
      channels(input: { organizationId: $organizationId }) {
        ${CHANNEL_FIELDS}
      }
    }
  `,
    { organizationId },
  );

  return data.channels ?? [];
}

export async function getChannel(channelId: string): Promise<Channel> {
  const data = await gql<{ channel: Channel }>(
    `
    query GetChannel($channelId: ChannelId!) {
      channel(input: { id: $channelId }) {
        ${CHANNEL_FIELDS}
      }
    }
  `,
    { channelId },
  );

  return data.channel;
}

export async function getPosts(
  organizationId: string,
  options: GetPostsOptions = {},
): Promise<PostsConnection> {
  const data = await gql<{ posts: PostsConnection }>(
    `
    query GetPosts(
      $organizationId: OrganizationId!
      $channelIds: [ChannelId!]
      $cursor: String
      $first: Int!
      $status: [PostStatus!]
      $startDate: DateTime
      $endDate: DateTime
    ) {
      posts(
        first: $first
        after: $cursor
        input: {
          organizationId: $organizationId
          filter: {
            status: $status
            channelIds: $channelIds
            startDate: $startDate
            endDate: $endDate
          }
        }
      ) {
        edges {
          node {
            ${POST_FIELDS}
          }
        }
        pageInfo {
          startCursor
          endCursor
          hasPreviousPage
          hasNextPage
        }
      }
    }
  `,
    {
      organizationId,
      channelIds: options.channelIds,
      cursor: options.cursor,
      first: Math.max(1, Math.min(options.limit ?? 30, 100)),
      status: options.status,
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
    },
  );

  return data.posts ?? emptyPostsConnection();
}

export async function getScheduledPosts(
  organizationId: string,
  channelIds?: string[],
  cursor?: string,
): Promise<PostsConnection> {
  return getPosts(organizationId, {
    channelIds,
    cursor,
    status: ["scheduled"],
  });
}

export async function getSentPosts(
  organizationId: string,
  channelIds?: string[],
  cursor?: string,
): Promise<PostsConnection> {
  return getPosts(organizationId, {
    channelIds,
    cursor,
    status: ["sent"],
  });
}

export async function getDraftPosts(
  organizationId: string,
  channelIds?: string[],
  cursor?: string,
): Promise<PostsConnection> {
  return getPosts(organizationId, {
    channelIds,
    cursor,
    status: ["draft", "needs_approval"],
  });
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const mode =
    input.mode ?? (input.scheduledAt ? "customScheduled" : "addToQueue");
  const metadata = buildPostMetadata(input.service);
  const assets = buildAssets(input);

  const data = await gql<{
    createPost:
      | { __typename: "PostActionSuccess"; post: Post }
      | { __typename: "InvalidInputError"; message: string }
      | { __typename: "LimitReachedError"; message: string }
      | { __typename: "NotFoundError"; message: string }
      | { __typename: "RestProxyError"; message: string }
      | { __typename: "UnauthorizedError"; message: string }
      | { __typename: "UnexpectedError"; message: string };
  }>(
    `
    mutation CreatePost(
      $channelId: ChannelId!
      $text: String!
      $scheduledAt: DateTime
      $mode: ShareMode!
      $schedulingType: SchedulingType!
      $metadata: PostInputMetaData
      $saveToDraft: Boolean
      $assets: AssetsInput
    ) {
      createPost(input: {
        channelId: $channelId
        text: $text
        dueAt: $scheduledAt
        mode: $mode
        schedulingType: $schedulingType
        metadata: $metadata
        saveToDraft: $saveToDraft
        assets: $assets
      }) {
        __typename
        ... on PostActionSuccess {
          post {
            ${POST_FIELDS}
          }
        }
        ... on InvalidInputError {
          message
        }
        ... on LimitReachedError {
          message
        }
        ... on NotFoundError {
          message
        }
        ... on RestProxyError {
          message
        }
        ... on UnauthorizedError {
          message
        }
        ... on UnexpectedError {
          message
        }
      }
    }
  `,
    {
      channelId: input.channelId,
      text: input.text,
      scheduledAt: input.scheduledAt?.toISOString(),
      mode,
      schedulingType: "automatic",
      metadata,
      saveToDraft: input.saveToDraft,
      assets,
    },
  );

  const result = data.createPost;
  if (result.__typename === "PostActionSuccess" && result.post) {
    return result.post;
  }

  const message = getMessageFromResult(result);
  throw new Error(
    message ?? `Buffer createPost failed with ${result.__typename}.`,
  );
}

export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
  const data = await gql<{
    createIdea:
      | ({ __typename: "Idea" } & Idea)
      | {
          __typename: "IdeaResponse";
          idea?: Idea | null;
          refreshIdeas: boolean;
        }
      | { __typename: "InvalidInputError"; message: string }
      | { __typename: "LimitReachedError"; message: string }
      | { __typename: "UnauthorizedError"; message: string }
      | { __typename: "UnexpectedError"; message: string };
  }>(
    `
    mutation CreateIdea($organizationId: ID!, $content: IdeaContentInput!) {
      createIdea(input: {
        organizationId: $organizationId
        content: $content
      }) {
        __typename
        ... on Idea {
          ${IDEA_FIELDS}
        }
        ... on IdeaResponse {
          refreshIdeas
          idea {
            ${IDEA_FIELDS}
          }
        }
        ... on InvalidInputError {
          message
        }
        ... on LimitReachedError {
          message
        }
        ... on UnauthorizedError {
          message
        }
        ... on UnexpectedError {
          message
        }
      }
    }
  `,
    {
      organizationId: input.organizationId,
      content: {
        title: input.title,
        text: input.text,
        services: input.services,
        date: input.date?.toISOString(),
      },
    },
  );

  const result = data.createIdea;
  if (result.__typename === "Idea") {
    return result;
  }

  if (result.__typename === "IdeaResponse" && result.idea) {
    return result.idea;
  }

  const message = getMessageFromResult(result);
  throw new Error(
    message ?? `Buffer createIdea failed with ${result.__typename}.`,
  );
}

export async function deletePost(postId: string): Promise<void> {
  const data = await gql<{
    deletePost:
      | { __typename: "DeletePostSuccess"; id: string }
      | { __typename: "VoidMutationError"; message?: string }
      | { __typename: "MutationError"; message?: string };
  }>(
    `
    mutation DeletePost($postId: PostId!) {
      deletePost(input: { id: $postId }) {
        __typename
        ... on DeletePostSuccess {
          id
        }
        ... on VoidMutationError {
          message
        }
        ... on MutationError {
          message
        }
      }
    }
  `,
    { postId },
  );

  const result = data.deletePost;
  if (result.__typename === "DeletePostSuccess") {
    return;
  }

  const message = getMessageFromResult(result);
  throw new Error(
    message ?? `Buffer deletePost failed with ${result.__typename}.`,
  );
}
