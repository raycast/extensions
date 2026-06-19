import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useLatex } from "./libs/use-latex";
import AddMetadata from "./create-equation-metadata";
import { EquationObj } from "./libs/use-equation";

type CreateEquationProps = {
  equation?: EquationObj;
};

export default function CreateEquation({ equation }: CreateEquationProps) {
  const [latex, setLatex] = useState<string>(equation ? equation.latex : "");
  const { push } = useNavigation();

  const { displayLatexURL } = useLatex();

  const imageUrl = latex ? displayLatexURL(latex) : "";

  return (
    <List searchBarPlaceholder="Enter LaTeX code..." searchText={latex} onSearchTextChange={setLatex}>
      <List.EmptyView
        icon={latex ? imageUrl : Icon.PlusMinusDivideMultiply}
        title={latex ? "" : "Enter LaTeX Code"}
        description={latex ? undefined : "Type LaTeX code in the search bar to preview"}
        actions={
          <ActionPanel>
            <Action title="Push" onAction={() => push(<AddMetadata latex={latex} equation={equation} />)} />
          </ActionPanel>
        }
      />
    </List>
  );
}
