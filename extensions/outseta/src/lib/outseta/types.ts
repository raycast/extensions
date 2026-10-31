// Only the fields the extension reads. The API returns many more; see fixtures/ for full shapes.
// Any field may be missing when a `fields` selection leaves it out, so everything is optional.

export enum AccountStage {
  Trialing = 2,
  Subscribing = 3,
  Cancelling = 4,
  Expired = 5,
  TrialExpired = 6,
  PastDue = 7,
  CancellingTrial = 8,
  Paused = 9,
  Created = 10,
}

export enum BillingRenewalTerm {
  Monthly = 1,
  Yearly = 2,
  Quarterly = 3,
  OneTime = 4,
}

export enum CaseStatus {
  Open = 1,
  Closed = 2,
  Spam = 3,
}

export enum CaseSource {
  Website = 1,
  Email = 2,
  Facebook = 3,
  Twitter = 4,
  Chat = 5,
}

export enum CaseHistoryType {
  PersonReply = 1,
  Note = 2,
  Closed = 3,
  Reopened = 4,
  Assigned = 5,
  AgentReply = 6,
  AutoReply = 7,
  ContactChange = 8,
}

export interface Entity {
  Uid: string;
  Created?: string;
  Updated?: string;
}

export interface Plan extends Entity {
  Name?: string;
  MonthlyRate?: number;
  QuarterlyRate?: number;
  AnnualRate?: number;
  OneTimeRate?: number;
}

export interface Subscription extends Entity {
  BillingRenewalTerm?: BillingRenewalTerm | null;
  Plan?: Plan | null;
  Quantity?: number | null;
  Rate?: number | null;
  StartDate?: string | null;
  EndDate?: string | null;
  RenewalDate?: string | null;
}

export interface Account extends Entity {
  Name?: string;
  AccountStage?: AccountStage;
  AccountStageLabel?: string;
  CurrentSubscription?: Subscription | null;
  LifetimeRevenue?: number;
  LastLoginDateTime?: string | null;
  StripeId?: string | null;
  PersonAccount?: PersonAccount[] | null;
}

export interface PersonAccount extends Entity {
  Person?: Person | null;
  Account?: Account | null;
  IsPrimary?: boolean;
}

export interface Person extends Entity {
  Email?: string;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  Title?: string;
  ProfileImageS3Url?: string | null;
  LastLoginDateTime?: string | null;
  PersonAccount?: PersonAccount[] | null;
}

export interface CaseHistory extends Entity {
  HistoryDateTime?: string;
  AgentName?: string | null;
  Comment?: string | null;
  Type?: CaseHistoryType;
}

export interface Case extends Entity {
  Subject?: string | null;
  Body?: string | null;
  Status?: CaseStatus;
  Source?: CaseSource;
  SubmittedDateTime?: string;
  LastActivity?: string;
  AssignedToPersonClientIdentifier?: string | null;
  FromPerson?: Person | null;
  CaseHistories?: CaseHistory[] | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}
