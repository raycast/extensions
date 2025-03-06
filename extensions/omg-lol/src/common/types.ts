// Common types
export interface WithMessage {
  message: string;
}

// Core types
export interface Paste {
  title: string;
  content: string;
  modified_on: number;
  listed: number | undefined;
}

export interface PURL {
  name: string;
  url: string;
  counter: number | undefined;
  listed: number | undefined;
}

export interface Account {
  address: string;
  registration: {
    unix_epoch_time: number;
  };
}

// Request types
export interface PasteCreateResponse extends WithMessage {
  title: string;
}

export interface PasteDeleteResponse extends WithMessage {}

export interface PasteListResponse extends WithMessage {
  pastebin: Paste[];
}

export interface PURLCreateResponse extends WithMessage {
  name: string;
  url: string;
}

export interface PURLDeleteResponse extends WithMessage {}

export interface PURLListResponse extends WithMessage {
  purls: PURL[];
}

export interface StatusCreateResponse extends WithMessage {
  id: string;
  url: string;
}

export interface StatusListResponse extends WithMessage {
  statuses: {
    id: string;
    content: string;
    emoji: string;
    url: string;
  }[];
}
