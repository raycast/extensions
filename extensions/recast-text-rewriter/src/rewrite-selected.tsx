import { getPreferenceValues, useNavigation } from "@raycast/api";
import { ResultView } from "./result-view";
import { SourceForm, SourceLoading, useSource } from "./source";

export default function Command() {
  const source = useSource();
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  if (!source) return <SourceLoading />;
  if (!source.text.trim())
    return (
      <SourceForm
        source={source}
        onSubmit={(value) =>
          push(
            <ResultView source={value} tone={preferences.defaultTone} nested />,
          )
        }
      />
    );
  return <ResultView source={source} tone={preferences.defaultTone} />;
}
