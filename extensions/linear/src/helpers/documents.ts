import { getIcon } from "./icons";
import { Doc } from "../api/documents";
import { Color, Icon } from "@raycast/api";

export function getDocumentIcon(doc: Pick<Doc, "icon" | "color" | "project">) {
  return getIcon({
    icon: doc.icon,
    color: doc.color,
    fallbackIcon: { source: Icon.Document, tintColor: doc.color ?? doc.project.color ?? Color.PrimaryText },
  });
}
