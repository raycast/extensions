export interface HubSpotWorkflow {
  revisionId: string;
  createdAt: string;
  objectTypeId: string;
  isEnabled: boolean;
  name: string;
  id: string;
  uuid: string;
  flowType: string;
  updatedAt: string;
}

export interface HubSpotPaging {
  next: {
    link: string;
    after: string;
  };
}

export interface HubSpotWorkflowsResponse {
  paging: HubSpotPaging;
  results: HubSpotWorkflow[];
}

export interface HubSpotApiConfig {
  apiKey: string;
  portalId: string;
}

export interface HubSpotMarketingEmail {
  id: string;
  name: string;
  subject: string;
  state: string;
  isPublished: boolean;
  isTransactional: boolean;
  type: string;
  createdAt: string;
  updatedAt: string;
  createdById: number;
  updatedById: number;
  from: {
    fromName: string;
    replyTo: string;
  };
  stats?: {
    counters: {
      sent: number;
      delivered: number;
      open: number;
      click: number;
      bounce: number;
    };
    ratios: {
      openratio: number;
      clickratio: number;
      bounceratio: number;
    };
  };
}

export interface HubSpotMarketingEmailsResponse {
  paging: HubSpotPaging;
  results: HubSpotMarketingEmail[];
  total: number;
}
