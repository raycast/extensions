import { randomUUID } from 'node:crypto';

import { requestCore, requestMetadata } from './request';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ----- Today's briefing -------------------------------------------------------

export type DealBriefing = {
  summary: string;
  atRiskCount: number;
  generatedDate: string;
};

export async function getDealBriefing(): Promise<DealBriefing> {
  const data = await requestMetadata<{ dealBriefing: DealBriefing }>(
    `query DealBriefing { dealBriefing { summary atRiskCount generatedDate } }`,
  );
  return data.dealBriefing;
}

// ----- Tasks / reminders ------------------------------------------------------

export type CrmTask = {
  id: string;
  title: string | null;
  status: string | null;
  dueAt: string | null;
};

type Connection<TNode> = { edges: { node: TNode }[] };

export async function listOpenTasks(): Promise<CrmTask[]> {
  const data = await requestCore<{ tasks: Connection<CrmTask> }>(
    `query FindManyTasks($filter: TaskFilterInput, $orderBy: [TaskOrderByInput], $limit: Int) {
      tasks(filter: $filter, orderBy: $orderBy, first: $limit) {
        edges { node { id title status dueAt } }
      }
    }`,
    {
      filter: { status: { neq: 'DONE' } },
      orderBy: [{ dueAt: 'AscNullsLast' }],
      limit: 100,
    },
  );
  return data.tasks.edges.map((edge) => edge.node);
}

// ----- Record search ----------------------------------------------------------

export type PersonRecord = {
  id: string;
  name: { firstName: string | null; lastName: string | null } | null;
  emails: { primaryEmail: string | null } | null;
  jobTitle: string | null;
  company: { id: string; name: string | null } | null;
};

export type CompanyRecord = {
  id: string;
  name: string | null;
  domainName: { primaryLinkUrl: string | null } | null;
  employees: number | null;
};

export type OpportunityRecord = {
  id: string;
  name: string | null;
  stage: string | null;
  amount: { amountMicros: number | null; currencyCode: string | null } | null;
  closeDate: string | null;
  company: { id: string; name: string | null } | null;
};

const wildcard = (text: string) => `%${text}%`;

export async function searchPeople(text: string): Promise<PersonRecord[]> {
  const data = await requestCore<{ people: Connection<PersonRecord> }>(
    `query FindManyPeople($filter: PersonFilterInput, $limit: Int) {
      people(filter: $filter, first: $limit) {
        edges { node {
          id
          name { firstName lastName }
          emails { primaryEmail }
          jobTitle
          company { id name }
        } }
      }
    }`,
    {
      filter: {
        or: [
          { name: { firstName: { ilike: wildcard(text) } } },
          { name: { lastName: { ilike: wildcard(text) } } },
          { emails: { primaryEmail: { ilike: wildcard(text) } } },
        ],
      },
      limit: 15,
    },
  );
  return data.people.edges.map((edge) => edge.node);
}

export async function searchCompanies(text: string): Promise<CompanyRecord[]> {
  const data = await requestCore<{ companies: Connection<CompanyRecord> }>(
    `query FindManyCompanies($filter: CompanyFilterInput, $limit: Int) {
      companies(filter: $filter, first: $limit) {
        edges { node {
          id
          name
          domainName { primaryLinkUrl }
          employees
        } }
      }
    }`,
    { filter: { name: { ilike: wildcard(text) } }, limit: 15 },
  );
  return data.companies.edges.map((edge) => edge.node);
}

export async function searchOpportunities(
  text: string,
): Promise<OpportunityRecord[]> {
  const data = await requestCore<{
    opportunities: Connection<OpportunityRecord>;
  }>(
    `query FindManyOpportunities($filter: OpportunityFilterInput, $limit: Int) {
      opportunities(filter: $filter, first: $limit) {
        edges { node {
          id
          name
          stage
          amount { amountMicros currencyCode }
          closeDate
          company { id name }
        } }
      }
    }`,
    { filter: { name: { ilike: wildcard(text) } }, limit: 15 },
  );
  return data.opportunities.edges.map((edge) => edge.node);
}

// ----- AI chat (Ask your CRM) -------------------------------------------------

type ChatMessagePart = {
  type: string;
  textContent: string | null;
  orderIndex: number | null;
};

type ChatMessage = {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  parts: ChatMessagePart[];
};

export type CopilotAnswer = { threadId: string; answer: string };

const CREATE_CHAT_THREAD = `
  mutation CreateChatThread { createChatThread { id } }
`;

// DeserveOS: sentinel modelId that forces the chat to use DeserveOS's own
// platform AI even when the workspace has connected its own (BYO) AI key. The
// Raycast plugin always uses DeserveOS's AI so it stays fast and reliable and
// never depends on the user's BYO provider limits. Keep in sync with the server
// constant DESERVEOS_PLATFORM_MODEL_ID.
const DESERVEOS_PLATFORM_MODEL_ID = 'deserveos-platform';

const SEND_CHAT_MESSAGE = `
  mutation SendChatMessage($threadId: UUID!, $text: String!, $messageId: UUID!, $modelId: String) {
    sendChatMessage(threadId: $threadId, text: $text, messageId: $messageId, modelId: $modelId) {
      messageId
      queued
    }
  }
`;

const GET_CHAT_MESSAGES = `
  query GetChatMessages($threadId: UUID!) {
    chatMessages(threadId: $threadId) {
      id
      role
      status
      createdAt
      parts { type textContent orderIndex }
    }
  }
`;

async function createChatThread(): Promise<string> {
  const data = await requestMetadata<{ createChatThread: { id: string } }>(
    CREATE_CHAT_THREAD,
  );
  return data.createChatThread.id;
}

async function getChatMessages(threadId: string): Promise<ChatMessage[]> {
  const data = await requestMetadata<{ chatMessages: ChatMessage[] }>(
    GET_CHAT_MESSAGES,
    { threadId },
  );
  return data.chatMessages ?? [];
}

const extractText = (message: ChatMessage): string =>
  [...message.parts]
    .filter((part) => part.type === 'text' && part.textContent)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .map((part) => part.textContent)
    .join('')
    .trim();

// Collapse duplicate concurrent calls (e.g. a dev-mode double render) so the
// same question is never sent to two freshly-created threads — that would
// double the AI token usage and worsen any provider rate limit.
const inFlight = new Map<string, Promise<CopilotAnswer>>();

export function askCopilot(
  question: string,
  existingThreadId?: string,
): Promise<CopilotAnswer> {
  const key = `${existingThreadId ?? 'new'}:${question}`;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = runAskCopilot(question, existingThreadId).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

// Send a message and poll until the worker persists the assistant reply. The
// generation runs in a background job regardless of any streaming subscription,
// so polling chatMessages reliably yields the final answer.
async function runAskCopilot(
  question: string,
  existingThreadId?: string,
): Promise<CopilotAnswer> {
  const threadId = existingThreadId ?? (await createChatThread());
  const messageId = randomUUID();

  const before = await getChatMessages(threadId);
  const knownAssistantIds = new Set(
    before
      .filter((message) => message.role === 'assistant')
      .map((message) => message.id),
  );

  await requestMetadata(SEND_CHAT_MESSAGE, {
    threadId,
    text: question,
    messageId,
    modelId: DESERVEOS_PLATFORM_MODEL_ID,
  });

  const deadline = Date.now() + 100_000;
  let delay = 1500;

  while (Date.now() < deadline) {
    await sleep(delay);

    const messages = await getChatMessages(threadId);
    const reply = messages
      .filter(
        (message) =>
          message.role === 'assistant' && !knownAssistantIds.has(message.id),
      )
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      .pop();

    if (reply && reply.status === 'sent') {
      const answer = extractText(reply);
      if (answer.length > 0) {
        return { threadId, answer };
      }
    }

    delay = Math.min(delay + 500, 3000);
  }

  throw new Error(
    "The AI didn't return an answer in time. Your workspace's AI model may be rate-limited — check your AI provider's token-per-minute limit, then try again.",
  );
}
