import { Color, Icon } from "@raycast/api";

import { DocumentResult } from "../tools/get-documents";

import { getIcon } from "./icons";

export function getDocumentIcon(doc: Pick<DocumentResult, "icon" | "color">) {
  return getIcon({
    icon: doc.icon ?? undefined,
    color: doc.color ?? undefined,
    fallbackIcon: { source: Icon.Document, tintColor: doc.color ?? Color.PrimaryText },
  });
}
