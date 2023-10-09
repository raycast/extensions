import { Icon, MenuBarExtra, Color, openExtensionPreferences } from "@raycast/api";
import { getProgressIcon, useCachedState } from "@raycast/utils";
import { calculateProgress, getProgressBar } from "./utils";
import { Deadline } from "./types";
import { useCachedDeadlines } from "./hooks/cache";
import { useCallback } from "react";

function buildMenubarTitle(deadline: Deadline | undefined) {
  return {
    title: deadline?.shortTitle ?? undefined,
    progressNumber: deadline ? calculateProgress(deadline.startDate, deadline.endDate) ?? 0 : 0,
  };
}

export default function Command() {
  const [deadlines, setDeadlines] = useCachedDeadlines();

  const favedDeadline = deadlines.find((deadline) => deadline.isFav);

  const [menubarTitle, setMenubarTitle] = useCachedState("menubarTitle", buildMenubarTitle(favedDeadline));

  const renderProgress = useCallback(
    (deadline: Deadline) => {
      const progressNumber = deadline ? calculateProgress(deadline.startDate, deadline.endDate) : 0;
      const subtitle = getProgressBar(progressNumber) + " " + progressNumber + "%";

      return (
        <MenuBarExtra.Item
          key={deadline.startDate.getTime() + deadline.endDate.getTime()}
          title={deadline.shortTitle || deadline.title}
          icon={getProgressIcon(
            progressNumber / 100,
            progressNumber > 50 ? (progressNumber > 80 ? Color.Red : Color.Yellow) : Color.SecondaryText
          )}
          subtitle={subtitle}
          onAction={() => {
            setDeadlines((deadlines) => {
              const newDeadlines = [...deadlines];
              for (let i = 0; i < newDeadlines.length; i++) {
                if (i !== deadlines.indexOf(deadline)) {
                  newDeadlines[i].isFav = false;
                } else {
                  newDeadlines[i].isFav = !newDeadlines[i].isFav;
                }
              }
              return newDeadlines;
            });
          }}
        />
      );
    },
    [setMenubarTitle, buildMenubarTitle, calculateProgress]
  );

  const pinnedDeadlines = deadlines.filter((deadline) => deadline.isPinned);

  const deadlinesInTheWeek = deadlines.filter(
    (deadline) => new Date(deadline.endDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && !deadline.isPinned
  );

  const otherDeadlines = deadlines.filter(
    (deadline) => deadlinesInTheWeek.indexOf(deadline) === -1 && !deadline.isPinned
  );

  return (
    <MenuBarExtra
      title={favedDeadline?.shortTitle ?? "No Favortie"}
      icon={favedDeadline ? getProgressIcon(menubarTitle.progressNumber / 100, Color.PrimaryText) : Icon.PinDisabled}
      tooltip={menubarTitle.progressNumber + "%"}
      isLoading={favedDeadline == null}
    >
      {pinnedDeadlines.length > 0 && (
        <MenuBarExtra.Section title={`Pinned Deadlines`}>
          {pinnedDeadlines.map((deadline) => renderProgress(deadline))}
        </MenuBarExtra.Section>
      )}
      {deadlinesInTheWeek.length > 0 && (
        <MenuBarExtra.Section title={`Upcoming Deadlines`}>
          {deadlinesInTheWeek.map((deadline) => renderProgress(deadline))}
        </MenuBarExtra.Section>
      )}
      {otherDeadlines.length > 0 && (
        <MenuBarExtra.Section title={`All Deadlines`}>
          {otherDeadlines.map((deadline) => renderProgress(deadline))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          key={"preferences"}
          title="Preferences..."
          onAction={async () => {
            await openExtensionPreferences();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
