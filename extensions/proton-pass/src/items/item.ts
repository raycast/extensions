export type ItemReference = { shareId: string; itemId: string };

export type ItemSummary = ItemReference & {
  vaultName: string;
  title: string;
  type: "login" | "alias";
  modifyTime?: string;
};

type CommonDetails = ItemReference & {
  title: string;
  note?: string;
  username?: string;
  email?: string;
  password?: string;
  urls: string[];
  hasTotp: boolean;
};

export type LoginDetails = CommonDetails & {
  type: "login";
  username?: string;
  email?: string;
  password?: string;
  urls: string[];
  hasTotp: boolean;
};

export type AliasDetails = CommonDetails & {
  type: "alias";
};

export type ItemDetails = LoginDetails | AliasDetails;

export function serializeItemReference(reference: ItemReference) {
  return `${reference.shareId}:${reference.itemId}`;
}

export function formatItemUrl(reference: ItemReference) {
  return `pass://${reference.shareId}/${reference.itemId}`;
}
