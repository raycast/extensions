import { List, Action, ActionPanel, Color, Icon, updateCommandMetadata } from "@raycast/api";

import { getProgressIcon } from "@raycast/utils";

import { Deadline } from "./types";
import { useCachedDeadlines } from "./hooks/cache";
import { CreateDeadlineForm } from "./create-deadline";
import { calculateProgress, getProgressBar } from "./utils";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function Command() {
  const [deadlines, setDeadlines] = useCachedDeadlines();
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Deadline[]>([]);
  const [otherDeadlines, setOtherDeadlines] = useState<Deadline[]>([]);
  const [filter, setFilter] = useState<string>("All");

  function handleCreate(deadline: Deadline) {
    if (deadline.isFav) {
      for (let i = 0; i < deadlines.length; i++) {
        if (i !== deadlines.indexOf(deadline)) {
          deadlines[i].isFav = false;
        }
      }
    }
    const newDeadlines = [...deadlines, deadline];
    setDeadlines(newDeadlines);
  }

  function handleDelete(deadline: Deadline) {
    const index = deadlines.findIndex(
      (d) => d.startDate.getTime() + d.endDate.getTime() === deadline.startDate.getTime() + deadline.endDate.getTime()
    );

    if (index === -1) {
      console.log("Error: deadline not found");
      return;
    }
    const newDeadlines = [...deadlines];
    newDeadlines.splice(index, 1);
    setDeadlines(newDeadlines);
  }

  function handleFav(deadline: Deadline) {
    const index = deadlines.findIndex(
      (d) => d.startDate.getTime() + d.endDate.getTime() === deadline.startDate.getTime() + deadline.endDate.getTime()
    );

    const newDeadlines = [...deadlines];

    for (let i = 0; i < newDeadlines.length; i++) {
      if (i !== index) {
        newDeadlines[i].isFav = false;
      } else {
        newDeadlines[i].isFav = !newDeadlines[i].isFav;
      }
    }
    setDeadlines(newDeadlines);
  }

  function handlePin(deadline: Deadline) {
    const index = deadlines.findIndex(
      (d) => d.startDate.getTime() + d.endDate.getTime() === deadline.startDate.getTime() + deadline.endDate.getTime()
    );

    if (index === -1) {
      console.log("Error: deadline not found");
      return;
    }
    const newDeadlines = [...deadlines];
    newDeadlines[index].isPinned = !newDeadlines[index].isPinned;
    setDeadlines(newDeadlines);
  }

  function createCommandSubtitile() {
    const deadline = deadlines.find((deadline) => deadline.isFav);

    if (deadline) {
      const progressNumber = deadline ? calculateProgress(deadline.startDate, deadline.endDate) : 0;
      return deadline?.shortTitle + ": " + getProgressBar(progressNumber) + " " + progressNumber + "%";
    } else {
      return undefined;
    }
  }

  const renderProgress = useCallback(
    (deadline: Deadline) => {
      const progressNumber = deadline ? calculateProgress(deadline.startDate, deadline.endDate) : 0;

      return (
        <List.Item
          key={deadline.startDate.getTime() + deadline.endDate.getTime()}
          title={deadline.title}
          icon={getProgressIcon(
            progressNumber / 100,
            progressNumber > 50 ? (progressNumber > 80 ? Color.Red : Color.Yellow) : Color.SecondaryText
          )}
          subtitle={`${getProgressBar(calculateProgress(deadline.startDate, deadline.endDate))} ${calculateProgress(
            deadline.startDate,
            deadline.endDate
          )}%`}
          accessories={[
            { icon: deadline.isPinned ? Icon.Pin : null },
            { icon: deadline.isFav ? Icon.Heart : null },
            { text: deadline.shortTitle, icon: Icon.ShortParagraph },
            { date: new Date(deadline.endDate), icon: Icon.Calendar },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <PinDeadlineAction onPin={() => handlePin(deadline)} isPinned={deadline.isPinned} />
                <FavDeadlineAction onFav={() => handleFav(deadline)} isFaved={deadline.isFav} />
                <DeleteDeadlineAction onDelete={() => handleDelete(deadline)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CreateDeadlineAction onCreate={handleCreate} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      );
    },
    [setDeadlines, calculateProgress]
  );

  useEffect(() => {
    updateCommandMetadata({ subtitle: createCommandSubtitile() });

    setUpcomingDeadlines(
      deadlines.filter(
        (deadline) => new Date(deadline.endDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && !deadline.isPinned
      )
    );
  }, [deadlines]);

  useEffect(() => {
    setOtherDeadlines(deadlines.filter((deadline) => upcomingDeadlines.indexOf(deadline) === -1 && !deadline.isPinned));
  }, [upcomingDeadlines]);

  const filteredDeadlines = useMemo(() => {
    switch (filter) {
      case "All":
        return deadlines;
      case "Upcoming":
        return upcomingDeadlines;
      case "Pinned":
        return deadlines.filter((deadline) => deadline.isPinned);
      default:
        return deadlines;
    }
  }, [deadlines, upcomingDeadlines, filter]);

  return (
    <List
      actions={
        <ActionPanel>
          <CreateDeadlineAction onCreate={handleCreate} />
        </ActionPanel>
      }
      searchBarAccessory={<DeadlineDropdown onDeadlineTypeChange={(newValue) => setFilter(newValue)} />}
      isLoading={!deadlines}
    >
      {filter === "All" ? (
        <>
          <List.Section title="Pinned Deadlines">
            {deadlines.filter((deadline) => deadline.isPinned).map((deadline) => renderProgress(deadline))}
          </List.Section>

          <List.Section title="Upcoming Deadlines">
            {upcomingDeadlines.map((deadline) => renderProgress(deadline))}
          </List.Section>
          <List.Section title="All Deadlines">
            {otherDeadlines.map((deadline) => renderProgress(deadline))}
          </List.Section>
        </>
      ) : (
        filteredDeadlines.map((deadline) => renderProgress(deadline))
      )}
    </List>
  );
}

function FavDeadlineAction(props: { onFav: () => void; isFaved: boolean }) {
  return (
    <Action
      icon={Icon.Star}
      title={props.isFaved ? "Unfavorite" : "Favorite"}
      shortcut={{ modifiers: ["opt"], key: "f" }}
      onAction={props.onFav}
    />
  );
}

function PinDeadlineAction(props: { onPin: () => void; isPinned: boolean }) {
  return (
    <Action
      icon={Icon.Pin}
      title={props.isPinned ? "Unpin" : "Pin"}
      shortcut={{ modifiers: ["opt"], key: "p" }}
      onAction={props.onPin}
    />
  );
}

function DeleteDeadlineAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Deadline"
      shortcut={{ modifiers: ["opt"], key: "x" }}
      onAction={props.onDelete}
    />
  );
}

function CreateDeadlineAction(props: { onCreate: (deadline: Deadline) => void }) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="New Deadline"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateDeadlineForm onCreate={props.onCreate} />}
    />
  );
}

function DeadlineDropdown(props: { onDeadlineTypeChange: (newValue: string) => void }) {
  const { onDeadlineTypeChange } = props;
  const deadlineTypes = ["All", "Upcoming", "Pinned"];
  return (
    <List.Dropdown
      tooltip="Select Filtering"
      storeValue={true}
      onChange={(newValue) => {
        onDeadlineTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Filter by">
        {deadlineTypes.map((deadlineType) => (
          <List.Dropdown.Item key={deadlineType} title={deadlineType} value={deadlineType} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
