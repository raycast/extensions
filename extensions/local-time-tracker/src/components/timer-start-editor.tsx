import { useState } from "react";
import { TimeEditor } from "./time-editor";
import { updateTimerStart } from "../lib/timer";
import type { ActiveTimer } from "../lib/types";

export function TimerStartEditor({ timer, onSaved }: { timer: ActiveTimer; onSaved: (timer: ActiveTimer) => void }) {
  const [initialTimer] = useState(timer);

  return (
    <TimeEditor
      title="Edit Start Time"
      initialTimes={{ startedAt: initialTimer.startedAt }}
      saveTitle="Save Start Time"
      successTitle="Start time updated"
      onSave={async (times) => {
        const updated = await updateTimerStart(initialTimer.id, initialTimer.startedAt, new Date(times.startedAt));
        onSaved(updated);
      }}
      note="Preview · Enter to save. Pomodoro unchanged; delivered alerts do not repeat."
    />
  );
}
