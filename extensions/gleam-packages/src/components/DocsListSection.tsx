import { List } from "@raycast/api";
import { Documentation } from "../types";
import DocsListItem from "./DocsListItem";

type DocsListSectionProps = {
  title: string;
  docs: Documentation[];
};

export default function DocsListSection({ title, docs }: DocsListSectionProps) {
  return (
    <List.Section key={title} title={title}>
      {docs.map((doc) => (
        <DocsListItem key={doc.module + doc.name} doc={doc} />
      ))}
    </List.Section>
  );
}
