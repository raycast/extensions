import { List, Icon } from "@raycast/api";
import { Markdown } from "../utils/parseMD";
import { DocumentActions } from "./DocumentActions";

type Props = {
  documentation: Markdown[];
};

export const DocumentsList = ({ documentation }: Props) => (
  <>
    {documentation.map((document) => (
      <List.Item
        icon={Icon.Dot}
        key={document.metadata?.title || "Untitled"}
        title={document.metadata?.title || "Untitled"}
        actions={<DocumentActions document={document} />}
      />
    ))}
  </>
);
