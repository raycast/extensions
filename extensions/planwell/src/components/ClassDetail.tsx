import { Detail, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import { Class } from "../types";

interface ClassDetailProps {
  allClasses: Class[];
  currentIndex: number;
}

export function ClassDetail({
  allClasses,
  currentIndex: initialIndex,
}: ClassDetailProps) {
  const [index, setIndex] = useState(initialIndex);
  const currentClass = allClasses[index];

  const hasPrevious = index > 0;
  const hasNext = index < allClasses.length - 1;

  return (
    <Detail
      markdown={currentClass.content || "*No notes yet*"}
      navigationTitle={currentClass.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Class" text={currentClass.name} />
          <Detail.Metadata.Label
            title="Position"
            text={`${index + 1} of ${allClasses.length}`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {hasNext ? (
            <Action title="Next Class" onAction={() => setIndex(index + 1)} />
          ) : (
            <Action title="End of List" onAction={() => {}} />
          )}
          {hasPrevious && (
            <Action
              title="Previous Class"
              onAction={() => setIndex(index - 1)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
