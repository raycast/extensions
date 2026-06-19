import type { Detail, List } from "@raycast/api";

type MetadataChild = Detail.Metadata.Props["children"] | List.Item.Detail.Metadata.Props["children"];
export type MetadataSection = MetadataChild[];
type MetadataSeparator = typeof Detail.Metadata.Separator | typeof List.Item.Detail.Metadata.Separator;

function isRenderableMetadataNode(node: MetadataChild): boolean {
  return node !== null && node !== undefined && node !== false;
}

export function joinMetadataSections(sections: MetadataSection[], Separator: MetadataSeparator): MetadataSection {
  return sections
    .map((section) => section.filter(isRenderableMetadataNode))
    .filter((section) => section.length > 0)
    .flatMap((section, index) =>
      index === 0 ? section : [(<Separator key={`separator-${index}`} />) as MetadataChild, ...section],
    );
}
