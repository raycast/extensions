import { Grid } from "@raycast/api";

import { PopIconCategory } from "../../helpers/get-popicon-categories";
import { sentenceCaseToTitleCase } from "../../helpers/sentence-case-to-title-case";
import { usePopiconGridContext } from "./popicon-grid-context";

const displayName = "PopiconGrid.Section";

type PopiconGridSectionProps = {
  category: PopIconCategory;
  children: React.ReactNode;
};

function PopiconGridSection(props: PopiconGridSectionProps) {
  usePopiconGridContext(displayName);

  return (
    <Grid.Section
      key={props.category.title}
      subtitle={props.category?.icons?.length.toString()}
      title={props.category?.title && sentenceCaseToTitleCase(props.category.title)}
    >
      {props.children}
    </Grid.Section>
  );
}

PopiconGridSection.displayName = displayName;

export { PopiconGridSection };
