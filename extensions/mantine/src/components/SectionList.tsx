import { List } from "@raycast/api";
import { SECTION_NAME_ALIASES } from "../constants";
import { DocumentationSection } from "../helpers/getDocumentation";
import { Markdown } from "../utils/parseMD";
import { uppercaseFirst } from "../utils/uppercaseFirst";
import { DocumentsList } from "./DocumentsList";

type Props = {
  data: DocumentationSection["data"];
  title: string;
};

export const SectionList = ({ data, title }: Props) => {
  const isDataCategorized = data.some((el) => el.metadata.category !== undefined);

  const groupedData = isDataCategorized
    ? data.reduce((acc: Record<string, Markdown[]>, el) => {
        const sectionName = (el.metadata.category as string) || "Uncategorized";

        if (sectionName === "Uncategorized") {
          console.error(el);
        }

        return {
          ...acc,
          [sectionName]: [...(acc[sectionName] || []), el],
        };
      }, {})
    : data;

  return (
    <List navigationTitle={title}>
      {isDataCategorized ? (
        <>
          {Object.entries(groupedData as Record<string, Markdown[]>).map(([sectionName, sectionData]) => (
            <List.Section title={SECTION_NAME_ALIASES[sectionName] || uppercaseFirst(sectionName)} key={sectionName}>
              <DocumentsList documentation={sectionData} />
            </List.Section>
          ))}
        </>
      ) : (
        <DocumentsList documentation={groupedData as Markdown[]} />
      )}
    </List>
  );
};
