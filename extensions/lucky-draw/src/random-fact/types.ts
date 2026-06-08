export type RandomFactEvent = {
  readonly description?: string;
  readonly itemUrl?: string;
  readonly title: string;
  readonly year?: string;
};

export type RandomFactSource = {
  readonly buildUrl: (date: Date) => string;
  readonly homepageUrl?: string;
  readonly id: string;
  readonly name: string;
  readonly parse: (payload: unknown) => readonly RandomFactEvent[];
};

export type RandomFactSelection = {
  readonly event: RandomFactEvent | null;
  readonly source: RandomFactSource;
};

export type RandomFactState =
  | { readonly kind: "loading" }
  | ({ readonly kind: "ready" } & RandomFactSelection)
  | { readonly kind: "empty"; readonly source: RandomFactSource }
  | { readonly kind: "error"; readonly message: string; readonly source?: RandomFactSource };
