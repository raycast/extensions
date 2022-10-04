export interface NewDocumentData {
  name: string;
  encrypted: boolean;
  password?: string;
}

export interface LocalDocumentReference {
  name: string;
  location: string;
  isEncrypted: boolean;
  isActive: boolean;
}

export type LocalDocumentReferences = Array<LocalDocumentReference>;

export type RevalidateDocuments = () => Promise<LocalDocumentReferences>;
