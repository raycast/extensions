import { getIcon } from "./icons";
import { DocumentResult } from "../tools/get-documents";
import { Color, Icon } from "@raycast/api";

export function getDocumentIcon(doc: Pick<DocumentResult, "icon" | "color">) {
  return getIcon({
    icon: doc.icon,
    color: doc.color,
    fallbackIcon: { source: Icon.Document, tintColor: doc.color ?? Color.PrimaryText },
  });
}
