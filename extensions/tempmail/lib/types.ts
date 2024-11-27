export interface Auth {
  address: string;
  password: string;
}

export interface Identity {
  id: string;
  token: string;
}

export type Domains = {
  "hydra:member": Array<{
    "@id": string;
    "@type": string;
    "@context": string;
    id: string;
    domain: string;
    isActive: boolean;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  "hydra:totalItems": number;
  "hydra:view": {
    "@id": string;
    "@type": string;
    "hydra:first": string;
    "hydra:last": string;
    "hydra:previous": string;
    "hydra:next": string;
  };
  "hydra:search": {
    "@type": string;
    "hydra:template": string;
    "hydra:variableRepresentation": string;
    "hydra:mapping": Array<{
      "@type": string;
      variable: string;
      property: string;
      required: boolean;
    }>;
  };
};

export type Messages = {
  "hydra:member": Array<{
    "@id": string;
    "@type": string;
    "@context": string;
    id: string;
    accountId: string;
    msgid: string;
    from: {
      name: string;
      address: string;
    };
    to: Array<{
      name: string;
      address: string;
    }>;
    subject: string;
    intro: string;
    seen: boolean;
    isDeleted: boolean;
    hasAttachments: boolean;
    size: number;
    downloadUrl: string;
    createdAt: string;
    updatedAt: string;
  }>;
  "hydra:totalItems": number;
  "hydra:view": {
    "@id": string;
    "@type": string;
    "hydra:first": string;
    "hydra:last": string;
    "hydra:previous": string;
    "hydra:next": string;
  };
  "hydra:search": {
    "@type": string;
    "hydra:template": string;
    "hydra:variableRepresentation": string;
    "hydra:mapping": Array<{
      "@type": string;
      variable: string;
      property: string;
      required: boolean;
    }>;
  };
};

export type Message = {
  "@context": string;
  "@id": string;
  "@type": string;
  id: string;
  accountId: string;
  msgid: string;
  from: {
    name: string;
    address: string;
  };
  to: Array<{
    name: string;
    address: string;
  }>;
  cc: Array<{
    name: string;
    address: string;
  }>;
  bcc: Array<{
    name: string;
    address: string;
  }>;
  subject: string;
  seen: boolean;
  flagged: boolean;
  isDeleted: boolean;
  verifications: Array<string>;
  retention: boolean;
  retentionDate: string;
  text: string;
  html: Array<string>;
  hasAttachments: boolean;
  attachments: Array<{
    id: string;
    filename: string;
    contentType: string;
    disposition: string;
    transferEncoding: string;
    related: boolean;
    size: number;
    downloadUrl: string;
  }>;
  size: number;
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
};
