import { getPreferenceValues } from "@raycast/api";
import { AggregatedPostMetrics, Channel, IdeaGroup, Organization, Post } from "./types";

const API_URL = "https://api.buffer.com";

interface Preferences {
  apiToken: string;
  organizationId?: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

class BufferError extends Error {}

async function bufferRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const { apiToken } = getPreferenceValues<Preferences>();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 429) {
    throw new BufferError(
      "Rate limit reached. Buffer allows a limited number of requests per 15 minutes – try again shortly.",
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new BufferError(
      "Authentication failed. Check your API token in the extension preferences.",
    );
  }

  if (!response.ok) {
    throw new BufferError(`Buffer API returned HTTP ${response.status}.`);
  }

  const json = (await response.json()) as GraphQLResponse<T>;

  // GraphQL can return partial data alongside field-level errors (e.g. a
  // `metrics` field that requires the insights:read scope). As long as we got
  // usable top-level data, return it and let the UI degrade gracefully.
  if (json.data) {
    return json.data;
  }

  if (json.errors && json.errors.length > 0) {
    throw new BufferError(json.errors.map((e) => e.message).join("\n"));
  }

  throw new BufferError("Buffer API returned no data.");
}

// Cache the resolved organization id for the lifetime of the command run.
let cachedOrganizationId: string | null = null;

export async function getOrganizationId(): Promise<string> {
  const { organizationId } = getPreferenceValues<Preferences>();
  if (organizationId && organizationId.trim().length > 0) {
    return organizationId.trim();
  }
  if (cachedOrganizationId) {
    return cachedOrganizationId;
  }

  const data = await bufferRequest<{
    account: { organizations: Organization[] };
  }>(`
    query Account {
      account {
        organizations {
          id
          name
        }
      }
    }
  `);

  const first = data.account.organizations[0];
  if (!first) {
    throw new BufferError("No organization found on this Buffer account.");
  }
  cachedOrganizationId = first.id;

  return first.id;
}

const POST_FIELDS = `
  id
  status
  text
  externalLink
  channelId
  channelService
  createdAt
  dueAt
  sentAt
  channel {
    id
    name
    displayName
    service
    avatar
  }
  assets {
    id
    type
    mimeType
    source
    thumbnail
  }
  metrics {
    type
    name
    description
    value
    unit
  }
  metricsUpdatedAt
`;

/**
 * Fetches all recent posts without a server-side status filter. We filter by
 * status client-side because Buffer's PostStatus enum input values are not
 * documented and rejected our guesses (e.g. "buffer"). For a personal account
 * (< 100 posts) this is cheap and avoids depending on undocumented enum names.
 */
export async function fetchAllPosts(): Promise<Post[]> {
  const organizationId = await getOrganizationId();

  const data = await bufferRequest<{
    posts: { edges: { node: Post }[] };
  }>(
    `
    query Posts($input: PostsInput!, $first: Int) {
      posts(input: $input, first: $first) {
        edges {
          node {
            ${POST_FIELDS}
          }
        }
      }
    }
  `,
    {
      input: { organizationId },
      first: 100,
    },
  );

  return data.posts.edges.map((edge) => edge.node);
}

export async function fetchChannels(): Promise<Channel[]> {
  const organizationId = await getOrganizationId();

  const data = await bufferRequest<{ channels: Channel[] }>(
    `
    query Channels($input: ChannelsInput!) {
      channels(input: $input) {
        id
        name
        displayName
        service
        avatar
        isDisconnected
        isLocked
      }
    }
  `,
    { input: { organizationId } },
  );

  return data.channels.filter((c) => !c.isDisconnected);
}

export async function fetchAggregatedMetrics(
  channelId: string,
  startDateTime: string,
  endDateTime: string,
): Promise<AggregatedPostMetrics> {
  const organizationId = await getOrganizationId();

  const data = await bufferRequest<{
    aggregatedPostMetrics: AggregatedPostMetrics;
  }>(
    `
    query AggregatedMetrics($input: AggregatedPostMetricsInput!) {
      aggregatedPostMetrics(input: $input) {
        metrics {
          type
          name
          description
          value
          unit
        }
        metricsUpdatedAt
      }
    }
  `,
    {
      input: {
        organizationId,
        channelIds: [channelId],
        startDateTime,
        endDateTime,
      },
    },
  );

  return data.aggregatedPostMetrics;
}

export async function fetchIdeaGroups(): Promise<IdeaGroup[]> {
  const organizationId = await getOrganizationId();

  const data = await bufferRequest<{ ideaGroups: IdeaGroup[] }>(
    `
    query IdeaGroups($input: IdeaGroupsInput!) {
      ideaGroups(input: $input) {
        id
        name
        isLocked
      }
    }
  `,
    { input: { organizationId } },
  );

  return data.ideaGroups;
}

export async function editPost(params: {
  id: string;
  text?: string;
  dueAt?: string | null;
}): Promise<void> {
  const input: Record<string, unknown> = { id: params.id };
  if (params.text !== undefined) input.text = params.text;
  if (params.dueAt !== undefined && params.dueAt !== null) input.dueAt = params.dueAt;

  await bufferRequest(
    `
    mutation EditPost($input: EditPostInput!) {
      editPost(input: $input) {
        __typename
      }
    }
  `,
    { input },
  );
}

export async function createIdea(params: {
  title?: string;
  text?: string;
}): Promise<void> {
  const organizationId = await getOrganizationId();

  const content: Record<string, unknown> = {};
  if (params.title) content.title = params.title;
  if (params.text) content.text = params.text;

  // Group assignment is intentionally omitted: Buffer's `IdeaGroupInput` shape
  // is undocumented (rejects `id`) and introspection is disabled, so we can't
  // reliably reference an existing group. Ideas land in the default group and
  // can be moved in Buffer. Revisit once the input shape is confirmed.
  const input: Record<string, unknown> = { organizationId, content };

  await bufferRequest(
    `
    mutation CreateIdea($input: CreateIdeaInput!) {
      createIdea(input: $input) {
        __typename
      }
    }
  `,
    { input },
  );
}
