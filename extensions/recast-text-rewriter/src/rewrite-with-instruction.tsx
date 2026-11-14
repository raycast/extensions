import {
  type LaunchProps,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { ResultView } from "./result-view";
import { SourceForm, SourceLoading, useSource } from "./source";

export default function Command(
  props: LaunchProps<{ arguments: Arguments.RewriteWithInstruction }>,
) {
  const source = useSource();
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const instruction = props.arguments.instruction?.trim();
  if (!source) return <SourceLoading />;
  if (instruction && source.text.trim())
    return (
      <ResultView
        source={source}
        tone={preferences.defaultTone}
        instruction={instruction}
      />
    );
  return (
    <SourceForm
      source={source}
      instruction={instruction}
      custom
      onSubmit={(value, customInstruction) =>
        push(
          <ResultView
            source={value}
            tone={preferences.defaultTone}
            instruction={customInstruction}
            nested
          />,
        )
      }
    />
  );
}
