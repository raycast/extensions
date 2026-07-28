export interface EmailSender {
  name: string;
  email: string;
}

export interface VerificationCode {
  code: string | null;
  receivedAt: Date;
  sender: EmailSender;
  emailText: string;
}

export interface ProcessedEmail {
  otp: string | undefined;
  link: ValidatedLink | undefined;
  ambiguousLinks: LinkCandidate[];
  sender: EmailSender;
  receivedAt: Date;
  emailText: string;
  senderRegistrableDomain: string | null;
  learnedPatterns: LearnedLinkPattern[];
}

export interface Email {
  internalDate: string;
  payload: EmailPayload;
}

export interface EmailPayload {
  headers: {
    name: string;
    value: string;
  }[];
  mimeType: string;
  parts?: EmailPayload[];
  body?: { data?: string; attachmentId?: string };
}

export interface ValidatedLink {
  href: string;
  hostname: string;
  pathSignature: string;
  normalizedCtaText: string;
  score: number;
  selectedBy: "automatic" | "learned-pattern";
  matchedPatternId?: string;
}

export interface LinkCandidate {
  href: string;
  hostname: string;
  registrableDomain: string;
  visibleText: string;
  normalizedVisibleText: string;
  pathSignature: string;
  originalIndex: number;
  isHttps: boolean;
  hasPositiveIntent: boolean;
  hasNegativeIntent: boolean;
  isSameRegistrableDomain: boolean;
  hasUnsafeReadableRedirect: boolean;
  score: number;
  rejectionReasons: string[];
  matchedPatternId?: string;
}

export interface LearnedLinkPattern {
  version: 1;
  id: string;
  senderAddress: string;
  senderRegistrableDomain: string;
  targetHostname: string;
  normalizedCtaText: string;
  pathSignature: string;
  createdAt: string;
  lastUsedAt: string;
  useCount: number;
}
