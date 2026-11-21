/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { QueryType, QueryWordInfo, RuntimeServiceMetadata } from "@/core/results/types";

import type { ContentEquivalent, DictionarySection } from "./types";

/** View layers keep service identity only; ordering is already owned upstream. */
export interface ViewService extends Omit<RuntimeServiceMetadata, "serviceOrder"> {
  readonly type: QueryType;
  readonly query: QueryWordInfo;
  readonly kind: "translation" | "dictionary";
  readonly fromCache?: boolean;
}

type ViewRowKind =
  | "translation"
  | "definition"
  | "equivalent"
  | "form"
  | "phrase"
  | "related"
  | "web-translation"
  | "form-set"
  | "example"
  | "summary"
  | "chinese-entry";

export interface ViewRow {
  readonly kind: ViewRowKind;
  readonly title: string;
  readonly subtitle?: string;
  readonly copyText: string;
  readonly tooltip?: string;
  readonly accessory?: { readonly phonetic?: string; readonly examTypes?: readonly string[] };
  readonly frequency?: ContentEquivalent["frequency"];
  readonly prominent?: boolean;
  readonly summarySource?: "encyclopedia" | "wikipedia";
  readonly service: ViewService;
  renderBody(): string;
}

export interface ViewSection {
  readonly kind: DictionarySection["kind"];
  readonly service: ViewService;
  readonly title?: string;
  readonly items: readonly ViewRow[];
}
