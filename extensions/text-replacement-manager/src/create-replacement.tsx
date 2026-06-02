import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import { useTextReplacements } from "./command-utils";
import { createReplacement } from "./lib/operations";
import { ReplacementForm } from "./replacement-form";

export default function Command() {
  const { replacements, isLoading, error, reload, persist } =
    useTextReplacements();

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

  return (
    <ReplacementForm
      title="Create Text Replacement"
      submitTitle="Create Replacement"
      existing={replacements}
      isLoading={isLoading}
      onSubmit={(input) =>
        persist(createReplacement(replacements, input), "Creating replacement")
      }
    />
  );
}
