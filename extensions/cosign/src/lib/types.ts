/** `lookup_person` item. `handle` is the X handle with its "@"; `profileUrl` is the x.com profile. */
export interface PersonResult {
  name: string;
  nomineeId: string | null;
  imageUrl: string | null;
  handle: string;
  onCosign: boolean;
  profileUrl: string | null;
}

export interface PersonRef {
  name: string;
  nomineeId: string | null;
  /** X handle. */
  handle: string | null;
  quote: string | null;
  profileUrl: string;
}

/** `read_person_profile` data. `handle` is the X handle. */
export interface PersonDetail {
  handle: string;
  nomineeId: string | null;
  name: string | null;
  displayName?: string | null;
  profileUrl: string;
  imageUrl?: string;
  headline?: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  city?: string | null;
  featured?: { title: string; description?: string; kind: string; sourceUrl: string; canonicalUrl?: string }[];
  experiences?: {
    organizationId: string | null;
    organizationName: string;
    position: string | null;
    title: string;
    startDate: string | null;
    endDate: string | null;
    location: string | null;
    description: string | null;
  }[];
  education?: { school: string; degree: string | null; graduationYear: number | null }[];
  cosignedByCount: number;
  cosignedBy: PersonRef[];
  cosignedCount: number;
  cosigned: PersonRef[];
}

export interface OrganizationResult {
  organizationId: string;
  name: string;
  imageUrl: string | null;
  type: "company" | "investment_firm";
  verified: boolean;
  url: string;
}

export interface TopicCompanyResult {
  organizationId: string;
  name: string;
  imageUrl: string | null;
  url: string;
  descriptionExcerpt: string | null;
}

export interface OrganizationDetail {
  organizationId: string;
  name: string;
  type: string;
  verified: boolean;
  url: string;
  website: string | null;
  tagline: string | null;
  about: string | null;
  headquarters: string | null;
  industry: string | null;
  size: string | null;
  lastRound: string | null;
  investors: string[];
  people: { name: string; handle: string | null; headline: string | null }[];
}

export interface FundingRound {
  roundId: string;
  stage: string;
  stageLabel: string | null;
  eventStatus: string;
  announcedAt: number | null;
  amount: { amount: number; currency: string } | null;
  valuation: { amount: number; basis: string; currency: string } | null;
  sourceUrls: string[];
  firms: { organizationId: string; name: string; lead: boolean; url: string | null }[];
  /** A participant is a person (nomineeId), a firm (investorOrganizationId), or neither. */
  participants: {
    name: string;
    role: string;
    nomineeId: string | null;
    investorOrganizationId: string | null;
    url: string | null;
  }[];
}

export interface FundingPage {
  coverage: string;
  rounds: FundingRound[];
  nextCursor: string | null;
}

export interface Job {
  postingId: string;
  title: string;
  location: string | null;
  remote: boolean | null;
  compensation: string | null;
  roleType: string | null;
  companyId: string;
  url: string;
  applyUrl: string;
  postedAt: string | null;
  team?: string | null;
  /** Only the first five results of a search carry a description. */
  description?: string | null;
  descriptionTruncated?: boolean;
}

export interface JobsPage {
  totalMatches: number | null;
  jobs: Job[];
  nextCursor: string | null;
}

/** Exactly one identity per `research_investors` investments call; the other two are sent as explicit nulls. */
export type InvestmentsQuery =
  { companyOrganizationId: string } | { investorNomineeId: string } | { investorOrganizationId: string };

export interface InvestmentRound {
  amount: { amount: number; currency: string } | null;
  announcedAt: number;
  stage: string;
  stageLabel: string | null;
  valuation: { amount: number; basis: string; currency: string } | null;
}

export interface Investment {
  participationId: string;
  /** Observed: angel, firm_participant, firm_representative, firm_lead, deal_lead. */
  role: string;
  /** Null when the stage/date are unknown. Never borrow the company's stage. */
  round: InvestmentRound | null;
  roundId: string | null;
  note: string | null;
  sourceUrls: string[];
  updatedAt: number;
  verified_company: boolean;
  verified_investor: boolean;
  company: { organizationId: string; name: string; imageUrl: string | null; profileUrl: string };
  investorOrganization: { organizationId: string; name: string; imageUrl: string | null; profileUrl: string } | null;
  investorPerson: { nomineeId: string; displayName: string; imageUrl: string | null; profileUrl: string } | null;
}

export interface InvestmentsPage {
  coverage: string;
  isDone: boolean;
  page: Investment[];
  nextCursor: string | null;
  pageStatus: string | null;
  continueCursor?: string | null;
  splitCursor?: string | null;
}

export interface InboxParty {
  name: string;
  imageUrl: string | null;
  profileUrl: string;
  /** Null for an organization counterpart; `principalKey` identifies either kind. */
  userId: string | null;
  principalKey: string;
  type: "person" | "organization";
  xUsername: string | null;
}

export interface Conversation {
  threadId: string;
  url: string;
  unread: boolean;
  blocked: boolean;
  blockedByViewer: boolean;
  counterpart: InboxParty;
  /** Why Cosign connected the two people. */
  connectionReason: string | null;
  context: string | null;
  /** One entry per direction: what each person said they would do with the other. */
  signalExchange?: { from: { userId: string }; to: { userId: string }; signalKinds: string[] }[];
  lastMessageAt: number;
  lastMessagePreview: string | null;
}

export interface ThreadMessage {
  messageId: string;
  /** Only "user" messages have an author; "system" and "activity" entries are written by Cosign. */
  kind: "user" | "system" | "activity";
  body: string;
  createdAt: number;
  senderUserId: string | null;
  senderPrincipalKey: string | null;
}

export interface ThreadPage {
  conversation: Omit<Conversation, "url">;
  url: string;
  /** Newest first. */
  page: ThreadMessage[];
  isDone: boolean;
}

export interface NetworkRequest {
  name: string;
  tagline: string | null;
  verified: boolean;
  imageUrl: string | null;
  profileUrl: string;
  actorUserId: string;
  /** Distinguishes a company sender from the person operating it; use it, not actorUserId, to tell requests apart. */
  reviewKey: string;
  actorTarget: { type: string; nomineeId?: string; organizationId?: string };
  closed: boolean;
  latestSignalAt: number;
  signalKinds: string[];
  experiences: { title: string; organizationName: string; dateRange?: string | null }[];
  mutualConnections?: { name: string; nomineeId: string }[];
}

export interface NetworkRequestPage {
  page: NetworkRequest[];
  isDone: boolean;
  continueCursor?: string | null;
}
