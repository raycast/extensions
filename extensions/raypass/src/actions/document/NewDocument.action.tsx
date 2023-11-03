import type { FC } from "react";
import type { RevalidateDocuments } from "../../types";
import { Action, Icon } from "@raycast/api";
import { NewDocumentForm } from "../../views";

interface Props {
  revalidateDocuments: RevalidateDocuments;
}

export const NewDocumentAction: FC<Props> = ({ revalidateDocuments }) => (
  <Action.Push
    icon={Icon.NewDocument}
    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
    title="New Document"
    target={<NewDocumentForm revalidateDocuments={revalidateDocuments} />}
  />
);
