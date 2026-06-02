import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import {
  TagColorsForm,
  useTagColors,
  useTextReplacements,
} from "./command-utils";

export default function Command() {
  const { replacements, isLoading, error, reload } = useTextReplacements();
  const { existingTags, tagColors, persistTagColors } =
    useTagColors(replacements);

  if (error) {
    return (
      <Detail
        markdown={`# Unable to Read Text Replacements\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.ArrowClockwise}
              title="Reload from macOS"
              onAction={reload}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return <Detail isLoading markdown="# Loading Tags" />;
  }

  return (
    <TagColorsForm
      tags={existingTags}
      tagColors={tagColors}
      onSubmit={persistTagColors}
    />
  );
}
