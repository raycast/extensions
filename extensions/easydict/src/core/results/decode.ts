/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { invalid, member, optional, record, text } from "./decodeFields";
import { PROVIDER_ICON_NAMES, type ProviderIconConfig } from "./types";

export function decodeIcon(value: unknown): ProviderIconConfig {
  const source = record(value, "item.serviceIcon");
  switch (source.kind) {
    case "preset":
      return { kind: source.kind, name: member(source.name, PROVIDER_ICON_NAMES, "item.serviceIcon.name") };
    case "remote":
      return { kind: source.kind, url: text(source.url, "item.serviceIcon.url") };
    case "favicon":
      return { kind: source.kind, website: optional(source.website, text, "item.serviceIcon.website") };
    case "initials":
      return { kind: source.kind };
    default:
      throw invalid("item.serviceIcon.kind");
  }
}
