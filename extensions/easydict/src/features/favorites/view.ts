/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { ComposedService } from "@/core/content/compose";
import { plainText } from "@/core/content/markdown";
import { renderDictionaryBody, renderSavedView } from "@/core/content/render";
import { buildContentView } from "@/core/content/view";
import type { ViewRow, ViewSection, ViewService } from "@/core/content/viewTypes";

import type { FavoriteWord } from "./model";

/** Both fresh and migrated favorites render without recomposing against current provider preferences. */
export function getFavoriteView(favorite: FavoriteWord): ViewSection[] {
  return favorite.services.flatMap((service): ViewSection[] => {
    const { content, type, serviceId, serviceLabel, serviceIcon } = service;
    if (content.kind !== "legacy") {
      return buildContentView({ services: [service as ComposedService], isShowDetail: false }, false);
    }
    const viewService: ViewService = {
      type,
      serviceId,
      serviceLabel,
      serviceIcon,
      kind: content.role,
      query: content.query,
    };
    return content.sections.map((section) => ({
      kind: section.kind,
      title: section.title,
      service: viewService,
      items: section.rows.map((row): ViewRow => {
        const view: ViewRow = {
          kind: row.kind,
          title: row.title,
          subtitle: row.subtitle,
          copyText: row.copyText,
          frequency: row.frequency,
          prominent: row.prominent,
          summarySource: row.summarySource,
          accessory: row.phonetic === undefined ? undefined : { phonetic: row.phonetic },
          service: row.query ? { ...viewService, query: row.query } : viewService,
          renderBody: () =>
            content.role === "translation" || row.bodyStyle === "raw-text"
              ? row.copyText
              : renderDictionaryBody(view, () => row.bodyMarkdown ?? plainText(row.copyText || row.title)),
        };
        return view;
      }),
    }));
  });
}

export function favoriteMarkdown(favorite: FavoriteWord): string {
  return renderSavedView(favorite.query, getFavoriteView(favorite));
}
