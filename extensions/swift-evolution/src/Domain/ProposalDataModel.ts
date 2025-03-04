export enum Status {
  awaitingReview = "awaitingReview",
  scheduledForReview = "scheduledForReview",
  activeReview = "activeReview",
  accepted = "accepted",
  acceptedWithRevisions = "acceptedWithRevisions",
  previewing = "previewing",
  implemented = "implemented",
  returnedForRevision = "returnedForRevision",
  deferred = "deferred",
  rejected = "rejected",
  withdrawn = "withdrawn",
}

export type ProposalDataModel = {
  id: string;
  title: string;
  status: Status;
  authors: {
    name: string;
    link: string;
  }[];
  implementations: {
    title: string;
    url: string;
  }[];
  reviewManagers: {
    name: string;
    link: string;
  }[];
  swiftVersion?: string;
  scheduled?: string;
  isNew: boolean;

  keywords: string[];
  link: string;
  markdownLink: string;
};
