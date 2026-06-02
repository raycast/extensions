import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import {
  ImportForm,
  uniqueTags,
  useTagColors,
  useTextReplacements,
} from "./command-utils";

export default function Command() {
  const { replacements, isLoading, error, reload, persist } =
    useTextReplacements();
  const { tagColors, persistTagColors } = useTagColors(replacements);

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
    return <Detail isLoading markdown="# Loading Text Replacements" />;
  }

  return (
    <ImportForm
      existing={replacements}
      onImport={async (imported, importedTagColors) => {
        const next = [...replacements, ...imported];
        await persist(next, "Importing replacements");
        if (Object.keys(importedTagColors).length) {
          await persistTagColors(
            { ...tagColors, ...importedTagColors },
            uniqueTags(next),
          );
        }
      }}
    />
  );
}
