export interface PersonResult {
  name: string;
  nomineeId: string;
  imageUrl: string | null;
  handle: string | null;
  onCosign: boolean;
  profileUrl: string;
}

export interface PersonRef {
  name: string;
  nomineeId: string;
  handle: string | null;
  quote: string | null;
  profileUrl: string;
}

export interface PersonDetail {
  handle: string | null;
  nomineeId: string;
  name: string;
  profileUrl: string;
  headline: string | null;
  bio: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  city: string | null;
  featured: { title: string; description: string | null; kind: string; canonicalUrl: string }[];
  experiences: {
    organizationId: string | null;
    organizationName: string | null;
    position: string | null;
    startDate: string | null;
    endDate: string | null;
    location: string | null;
    description: string | null;
  }[];
  education: { school: string | null; degree: string | null; graduationYear: number | string | null }[];
  cosignedByCount: number;
  cosignedBy: PersonRef[];
  cosignedCount: number;
  cosigned: PersonRef[];
}

export interface OrganizationResult {
  organizationId: string;
  name: string;
  imageUrl: string | null;
  type: string;
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
  stageLabel: string;
  eventStatus: string;
  announcedAt: number | null;
  amount: { amount: number; currency: string } | null;
  valuation: { amount: number; basis: string; currency: string } | null;
  sourceUrls: string[];
  firms: { organizationId: string; name: string; lead: boolean; url: string }[];
  participants: { name: string; role: string; nomineeId: string; url: string }[];
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
  remote: boolean;
  compensation: string | null;
  roleType: string | null;
  url: string;
  applyUrl: string | null;
  postedAt: string | null;
  team: string | null;
  description: string | null;
  descriptionTruncated: boolean;
}

export interface JobsPage {
  totalMatches: number;
  jobs: Job[];
  nextCursor: string | null;
}

/** Exactly one identity per `get_investments` call; the other two are sent as explicit nulls. */
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
