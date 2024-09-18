export interface Domain {
  "@id": string;
  "@type": string;
  id: string;
  domain: string;
  isActive: boolean;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface DomainResponse {
  "@context": string;
  "@id": string;
  "@type": string;
  "hydra:totalItems": number;
  "hydra:member": Domain[];
}

export interface TokenResponse {
  token: string;
  id: string;
}

export interface Account {
  email: string;
  password: string;
  token: string;
  id: string;
}

export interface MailResponse {
  "@context": string;
  "@id": string;
  "@type": string;
  "hydra:totalItems": number;
  "hydra:member": Mail[];
}

export interface Mail {
  "@id": string;
  "@type": string;
  id: string;
  msgid: string;
  from: {
    address: string;
    name: string;
  };
  to: [
    {
      address: string;
      name: string;
    },
  ];
  subject: string;
  intro: string;
  seen: boolean;
  isDeleted: boolean;
  hasAttachments: boolean;
  size: number;
  downloadUrl: string;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
  accountId: string;
}

export interface Message extends Mail {
  text: string;
  html: string[];
}

export type Interval = {
  label: string;
  seconds: number;
};
