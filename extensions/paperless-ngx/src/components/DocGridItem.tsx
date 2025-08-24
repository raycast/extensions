import { environment, Grid } from "@raycast/api";
import { DocActions } from "./DocActions";
import { DocItem } from "../models/docItem.model";

export const DocGridItem = ({ document, type }: DocItem): JSX.Element => {
  return (
    <Grid.Item
      key={document.id}
      title={document.title}
      subtitle={type}
      content={`${environment.assetsPath}/${document.id}.png`}
      actions={<DocActions key={document.id} document={document} />}
    />
  );
};
