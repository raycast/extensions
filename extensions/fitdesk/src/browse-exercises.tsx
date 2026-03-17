import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import {
  Exercise,
  Category,
  exercises,
  categoryLabels,
  categoryIcons,
  getExercisesByCategory,
} from "./exercises";
import { ExerciseSession } from "./components/ExerciseSession";

function formatAmount(exercise: Exercise): string {
  if (exercise.type === "reps") {
    return `${exercise.amount} reps`;
  }
  const mins = Math.floor(exercise.amount / 60);
  const secs = exercise.amount % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return `${exercise.amount}s`;
}

function getExerciseMarkdown(exercise: Exercise): string {
  const categoryIcon = categoryIcons[exercise.category];
  const categoryLabel = categoryLabels[exercise.category];
  const amountText =
    exercise.type === "reps"
      ? `**${exercise.amount} reps**`
      : `**${formatAmount(exercise)}**`;

  const gifSection = exercise.gif
    ? `\n\n![${exercise.name}](${exercise.gif})\n`
    : "";

  console.log(gifSection);

  return `
# ${categoryIcon} ${exercise.name}

**Category:** ${categoryLabel}

**Goal:** ${amountText}
${gifSection}
---

## Description

${exercise.description}

---

## Tips

${exercise.tips.map((tip) => `- ${tip}`).join("\n")}
`;
}

export default function BrowseExercises() {
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">(
    "all",
  );

  const filteredExercises =
    selectedCategory === "all"
      ? exercises
      : getExercisesByCategory(selectedCategory);

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search exercise..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by category"
          value={selectedCategory}
          onChange={(value) => setSelectedCategory(value as Category | "all")}
        >
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
          <List.Dropdown.Section title="Categories">
            {(
              ["upper", "core", "lower", "cardio", "full-body"] as Category[]
            ).map((cat) => (
              <List.Dropdown.Item
                key={cat}
                title={`${categoryIcons[cat]} ${categoryLabels[cat]}`}
                value={cat}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredExercises.map((exercise) => (
        <List.Item
          key={exercise.id}
          title={exercise.name}
          icon={categoryIcons[exercise.category]}
          accessories={[{ text: formatAmount(exercise) }]}
          detail={<List.Item.Detail markdown={getExerciseMarkdown(exercise)} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Start Exercise"
                icon={Icon.Play}
                target={
                  <ExerciseSession
                    exercise={exercise}
                    showAnotherButton={false}
                    autoStart
                  />
                }
              />
              <Action.CopyToClipboard
                title="Copy Description"
                content={`${exercise.name}: ${exercise.description}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
