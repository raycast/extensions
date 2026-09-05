import { Action, ActionPanel, Detail, Icon, Keyboard, LocalStorage, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { guides } from "./data/guides";
import { taxonomy } from "./data/taxonomy";

const DISMISSED_DATE_KEY = "dismissed-date";
const GUIDE_PROGRESS_KEY = "guide-progress";
const DAY_IN_MILLISECONDS = 86_400_000;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function greatestCommonDivisor(left: number, right: number): number {
  return right === 0 ? left : greatestCommonDivisor(right, left % right);
}

function rotationStep(length: number) {
  let step = Math.max(1, Math.floor(length * 0.382));
  while (greatestCommonDivisor(step, length) !== 1) step += 1;
  return step;
}

function guideFor(dateKey: string, offset = 0) {
  const dayNumber = Math.floor(new Date(`${dateKey}T00:00:00Z`).getTime() / DAY_IN_MILLISECONDS);
  // Walk every entry once per cycle while keeping adjacent guides far apart in the source dataset.
  const position = (dayNumber + offset) * rotationStep(guides.length);
  const index = ((position % guides.length) + guides.length) % guides.length;
  return { guide: guides[index], index };
}

type GuideProgress = {
  date: string;
  offset: number;
};

export default function Command() {
  const today = localDateKey();
  const [dismissed, setDismissed] = useState<boolean>();
  const [guideOffset, setGuideOffset] = useState<number>();

  useEffect(() => {
    Promise.all([
      LocalStorage.getItem<string>(DISMISSED_DATE_KEY),
      LocalStorage.getItem<string>(GUIDE_PROGRESS_KEY),
    ]).then(([dismissedDate, storedProgress]) => {
      setDismissed(dismissedDate === today);

      try {
        const progress = storedProgress ? (JSON.parse(storedProgress) as GuideProgress) : undefined;
        setGuideOffset(progress?.date === today && Number.isInteger(progress.offset) ? progress.offset : 0);
      } catch {
        setGuideOffset(0);
      }
    });
  }, [today]);

  async function dismiss() {
    await LocalStorage.setItem(DISMISSED_DATE_KEY, today);
    setDismissed(true);
    await popToRoot();
  }

  async function showAgain() {
    await LocalStorage.removeItem(DISMISSED_DATE_KEY);
    setDismissed(false);
  }

  async function showNextGuide() {
    const nextOffset = (guideOffset ?? 0) + 1;
    const progress: GuideProgress = { date: today, offset: nextOffset };
    await LocalStorage.setItem(GUIDE_PROGRESS_KEY, JSON.stringify(progress));
    setGuideOffset(nextOffset);
  }

  if (dismissed === undefined || guideOffset === undefined) {
    return <Detail isLoading />;
  }

  if (dismissed) {
    return (
      <Detail
        markdown={`# Rest mode

Today's guide is snoozed until **00:00 local time**.

---

Changed your mind? You can bring it back now.`}
        actions={
          <ActionPanel>
            <Action title="Show Again" icon={Icon.ArrowCounterClockwise} onAction={showAgain} />
          </ActionPanel>
        }
      />
    );
  }

  const { guide } = guideFor(today, guideOffset);
  const location = taxonomy[guide.source];
  const sectionPath = [location?.section, location?.topic].filter(Boolean).join(" › ");
  const markdown = `# Guide of the Day · ${location?.guide ?? "Open Source Guides"}

### ${sectionPath || "Overview"}

---

## ${guide.title}

> ${guide.fact}

---

## One small move

${guide.action}

---

*Adapted from Open Source Guides under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).*`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Next Guide" icon={Icon.ArrowRight} onAction={showNextGuide} />
          <Action
            title="Snooze Until Tomorrow"
            icon={Icon.Moon}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={dismiss}
          />
          <Action.OpenInBrowser
            title="Read the Original Section"
            url={guide.source}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Guide"
            content={`${guide.title}\n\n${guide.fact}\n\nOne small move: ${guide.action}\n\nSource: ${guide.source}`}
          />
        </ActionPanel>
      }
    />
  );
}
