import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { t } from "../i18n.ts";
import type { LibraryState } from "../model.ts";
import { ConflictView } from "./conflict-view.tsx";
import type { ConflictChoice } from "./conflict-view.tsx";
import { conflictTitle } from "./value-labels.ts";

export function ConflictsSection({
  state,
  resolutions,
  onChoose,
  onApply,
}: {
  state: LibraryState;
  resolutions: Record<string, ConflictChoice>;
  onChoose: (entityKey: string, choice: ConflictChoice) => void;
  onApply: () => Promise<void>;
}) {
  const { push } = useNavigation();
  return (
    <List.Section
      title={t`未解决冲突（${state.conflicts.length}）`}
      subtitle={t("普通写入已暂停，仅允许解决冲突")}
    >
      {state.conflicts.map((conflict) => {
        const chosen = resolutions[conflict.entityKey];
        return (
          <List.Item
            key={conflict.entityKey}
            title={conflictTitle(conflict)}
            subtitle={conflict.message}
            icon={Icon.Warning}
            accessories={[
              { tag: t`${conflict.candidates.length} 个版本` },
              {
                text: chosen
                  ? t`已选择 ${chosen.eventId.slice(0, 8)}`
                  : t("未选择"),
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={t("查看版本并选择")}
                  icon={Icon.List}
                  onAction={() =>
                    push(
                      <ConflictView
                        state={state}
                        conflict={conflict}
                        onChoose={(choice) =>
                          onChoose(conflict.entityKey, choice)
                        }
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.Item
        title={t("应用全部冲突解决")}
        subtitle={t`已选择 ${Object.keys(resolutions).length}/${state.conflicts.length}；必须一次解决全部冲突`}
        icon={Icon.Checkmark}
        actions={
          <ActionPanel>
            <Action
              title={t("应用全部冲突解决")}
              icon={Icon.Checkmark}
              onAction={onApply}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
