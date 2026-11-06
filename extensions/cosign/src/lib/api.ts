import { callTool } from "./cosign-mcp";
import type {
  Conversation,
  FundingPage,
  InvestmentsPage,
  InvestmentsQuery,
  JobsPage,
  NetworkRequest,
  NetworkRequestPage,
  OrganizationDetail,
  PersonDetail,
  ThreadPage,
} from "./types";

/** Takes one reference: a nomineeId, or an X handle. The tool wants every unused reference sent as null. */
export const fetchPerson = (ref: { nomineeId?: string; handle?: string }) =>
  callTool<PersonDetail>("read_person_profile", {
    handle: null,
    profileUrl: null,
    nomineeId: null,
    slug: null,
    ...ref,
  });

/** read_company answers an investment firm with `{ error }`; a firm's profile lives under research_investors. */
export async function fetchOrganization(organizationId: string): Promise<OrganizationDetail> {
  const company = await callTool<OrganizationDetail | { error: string }>("read_company", {
    request: { action: "profile", args: { organizationId } },
  });
  if (!("error" in company)) return company;
  const firm = await callTool<OrganizationDetail | { error: string }>("research_investors", {
    request: { action: "firm_profile", args: { organizationId } },
  });
  // Neither a company nor a firm: surface Cosign's reason rather than render an empty profile.
  if ("error" in firm) throw new Error(firm.error || company.error);
  return firm;
}

/**
 * Follows the funding cursor until Cosign returns null, so older rounds aren't dropped. A non-null `nextCursor` on the
 * result means the history is incomplete: the page cap was hit, or the server repeated a cursor.
 */
export async function fetchFunding(organizationId: string): Promise<FundingPage> {
  const rounds: FundingPage["rounds"] = [];
  const seen = new Set<string>();
  let coverage = "";
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const page: FundingPage = await callTool<FundingPage>("read_company", {
      request: { action: "funding", args: { organizationId, cursor } },
    });
    coverage = page.coverage;
    rounds.push(...page.rounds.filter((r) => !rounds.some((p) => p.roundId === r.roundId)));
    if (!page.nextCursor) return { coverage, rounds, nextCursor: null };
    if (seen.has(page.nextCursor)) break;
    seen.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  return { coverage, rounds, nextCursor: cursor };
}

// search_jobs takes every criterion explicitly; null, false or [] means "no filter".
const NO_JOB_CRITERIA = {
  savedOnly: false,
  remoteOnly: false,
  city: null,
  minStage: null,
  minRaisedUsd: null,
  minSalaryUsd: null,
  postedDateRange: null,
  investorName: null,
  employerName: null,
  excludedDescriptionTerms: [],
  titleTerm: null,
  descriptionTerm: null,
  country: null,
  onePerCompany: false,
  companyKeywords: [],
};

/** A company's roles are a search filtered by employer name. A next page keeps the query and sends criteria null. */
export const fetchJobs = (employerName: string, cursor: string | null = null) =>
  callTool<JobsPage>("search_jobs", {
    query: `Open roles at ${employerName}`,
    criteria: cursor ? null : { ...NO_JOB_CRITERIA, employerName },
    cursor,
    limit: 10,
  });

export const fetchInvestments = (query: InvestmentsQuery, cursor: string | null = null) =>
  callTool<InvestmentsPage>("research_investors", {
    request: {
      action: "investments",
      args: { companyOrganizationId: null, investorNomineeId: null, investorOrganizationId: null, ...query, cursor },
    },
  });

export const fetchConversations = () =>
  callTool<Conversation[]>("read_conversations", { request: { action: "inbox", args: {} } });

export const fetchThread = (threadId: string) =>
  callTool<ThreadPage>("read_conversations", { request: { action: "messages", args: { threadId } } });

/**
 * Follows `continueCursor` up to a few pages. `isDone: false` on the result means the list is still partial.
 * A sender can recur across pages; Cosign asks for one row per reviewKey with the signal kinds combined.
 */
export async function fetchNetworkRequests(): Promise<NetworkRequestPage> {
  const page: NetworkRequestPage["page"] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let i = 0; i < 5; i++) {
    const res: NetworkRequestPage = await callTool<NetworkRequestPage>("browse_network", cursor ? { cursor } : {});
    for (const r of res.page) {
      const prior = page.find((p) => p.reviewKey === r.reviewKey);
      if (prior) prior.signalKinds = [...new Set([...prior.signalKinds, ...r.signalKinds])];
      else page.push(r);
    }
    cursor = res.continueCursor ?? null;
    if (res.isDone || !cursor || seen.has(cursor)) return { page, isDone: res.isDone, continueCursor: cursor };
    seen.add(cursor);
  }
  return { page, isDone: false, continueCursor: cursor };
}

/** Accepting takes the sender's nomineeId (a person) or organizationId (a company), exactly one. Returns the new chat. */
export function acceptNetworkRequest(request: NetworkRequest) {
  const { type, nomineeId, organizationId } = request.actorTarget;
  const target = type === "person" ? { nomineeId } : { organizationId };
  if (!Object.values(target)[0]) throw new Error("This request has no sender to accept.");
  return callTool<{ threadId: string; url: string } | null>("accept_network_request", target);
}

export const archiveNetworkRequest = (request: NetworkRequest, archived: boolean) =>
  callTool<null>("set_network_request_archived", {
    senderUserId: request.actorUserId,
    reviewKey: request.reviewKey,
    archived,
  });
