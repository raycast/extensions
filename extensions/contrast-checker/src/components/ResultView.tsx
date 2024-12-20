import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";
import { evaluateContrast } from "../utils";

interface ResultValues {
  calculatedRatio: number;
}

export function ResultView(props: ResultValues) {
  const { pop } = useNavigation();

  const message = evaluateContrast(props.calculatedRatio);

  return (
    <Detail
      markdown={`${message}`}
      actions={
        <ActionPanel>
          <Action title="Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
