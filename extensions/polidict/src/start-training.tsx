import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useGroups } from "./hooks";
import { createApiClient } from "./api";
import { formatRaycastError } from "./utils";
import { MixedTrainingRouter } from "./components/MixedTrainingRouter";
import { CurrentLanguageActions } from "./components/CurrentLanguageActions";
import { TrainingType } from "./types";
import { pruneExpiredTemporaryDisableState, filterOutTemporarilyDisabledTypes } from "./components/temporary-disable";
import { loadTemporaryDisableState, saveTemporaryDisableState } from "./components/temporary-disable-storage";
import { CommandShell, type CommandShellContext } from "./core/command-shell";

interface TrainingMode {
  id: string;
  title: string;
  description: string;
  icon: Icon;
  trainingTypes?: TrainingType[];
}

const TRAINING_MODES: TrainingMode[] = [
  {
    id: "mixed",
    title: "Mixed Training",
    description: "Practice with various training types",
    icon: Icon.Layers,
    trainingTypes: [
      TrainingType.QUIZ,
      TrainingType.QUIZ_REVERSE,
      TrainingType.FLASHCARD,
      TrainingType.WRITING,
      TrainingType.WRITING_SELECTION,
      TrainingType.LISTENING,
      TrainingType.MATCHING_LEARNING_ITEM_DEFINITION,
      TrainingType.MATCHING_LEARNING_ITEM_LISTENING,
    ],
  },
  {
    id: "quiz",
    title: "Quiz",
    description: "Pick the correct definition or word",
    icon: Icon.List,
    trainingTypes: [TrainingType.QUIZ, TrainingType.QUIZ_REVERSE],
  },
  {
    id: "flashcard",
    title: "Flashcard",
    description: "Review cards with front and back",
    icon: Icon.BlankDocument,
    trainingTypes: [TrainingType.FLASHCARD],
  },
  {
    id: "writing",
    title: "Writing",
    description: "Type the word from its definition",
    icon: Icon.Pencil,
    trainingTypes: [TrainingType.WRITING, TrainingType.WRITING_SELECTION],
  },
  {
    id: "listening",
    title: "Listening",
    description: "Listen and pick the correct word",
    icon: Icon.Headphones,
    trainingTypes: [TrainingType.LISTENING],
  },
  {
    id: "matching",
    title: "Matching",
    description: "Match words to their definitions",
    icon: Icon.Shuffle,
    trainingTypes: [TrainingType.MATCHING_LEARNING_ITEM_DEFINITION, TrainingType.MATCHING_LEARNING_ITEM_LISTENING],
  },
];

interface StartTrainingProps {
  defaultGroupId?: string;
}

interface StartTrainingContentProps extends CommandShellContext {
  defaultGroupId?: string;
}

function StartTrainingContent({
  authIdentity,
  currentLanguage,
  languageActions,
  signOutAction,
  defaultGroupId,
}: StartTrainingContentProps) {
  const { push } = useNavigation();

  const { data: groups, isLoading: groupsLoading } = useGroups(currentLanguage, authIdentity, { pageSize: 100 });

  const [selectedGroup, setSelectedGroup] = useState<string>(defaultGroupId ?? "");
  const [isGenerating, setIsGenerating] = useState(false);

  const isLoading = groupsLoading;
  const userLanguage = currentLanguage;

  async function startTraining(mode: TrainingMode) {
    setIsGenerating(true);

    try {
      const client = createApiClient();
      const loadedState = await loadTemporaryDisableState(userLanguage.languageCode);
      const prunedState = pruneExpiredTemporaryDisableState(loadedState);
      const initialTemporaryDisableState = prunedState;

      if (loadedState.speaking !== prunedState.speaking || loadedState.listening !== prunedState.listening) {
        await saveTemporaryDisableState(userLanguage.languageCode, prunedState);
      }

      const trainingTypes = mode.trainingTypes
        ? filterOutTemporarilyDisabledTypes(mode.trainingTypes, prunedState)
        : undefined;

      const training = await client.trainings.generateMixedTraining({
        userLanguage,
        groupIds: selectedGroup ? [selectedGroup] : undefined,
        trainingTypes,
      });

      if (!training.items.length) {
        showToast({
          style: Toast.Style.Failure,
          title: "No items to train",
          message: "Add more vocabulary or select different groups",
        });
        return;
      }

      push(
        <MixedTrainingRouter
          items={training.items}
          userLanguage={userLanguage}
          initialTemporaryDisableState={initialTemporaryDisableState}
        />,
      );
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <List
      isLoading={isLoading || isGenerating}
      navigationTitle="Start Training"
      searchBarPlaceholder="Search training modes..."
      searchBarAccessory={
        groups && groups.length > 0 ? (
          <List.Dropdown tooltip="Filter by Group" value={selectedGroup} onChange={setSelectedGroup}>
            <List.Dropdown.Item title="All Groups" value="" />
            <List.Dropdown.Section title="Groups">
              {groups.map((group) => (
                <List.Dropdown.Item key={group.id} title={group.name} value={group.id} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {TRAINING_MODES.map((mode) => (
        <List.Item
          key={mode.id}
          icon={mode.icon}
          title={mode.title}
          subtitle={mode.description}
          actions={
            <ActionPanel>
              <Action title="Start Training" icon={Icon.Play} onAction={() => startTraining(mode)} />
              <CurrentLanguageActions {...languageActions} onLanguageChanged={() => setSelectedGroup("")} />
              {signOutAction}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function StartTraining({ defaultGroupId = "" }: StartTrainingProps = {}) {
  return (
    <CommandShell>{(context) => <StartTrainingContent {...context} defaultGroupId={defaultGroupId} />}</CommandShell>
  );
}
