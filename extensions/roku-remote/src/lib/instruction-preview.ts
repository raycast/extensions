import type { PreparedInstruction } from "./automation";
import type { RoutineStep } from "./routines";

const KEY_LABELS: Record<string, string> = {
  Home: "Go Home",
  Back: "Go Back",
  Up: "Move Up",
  Down: "Move Down",
  Left: "Move Left",
  Right: "Move Right",
  Select: "Select / OK",
  Info: "Open Options",
  Play: "Toggle Play/Pause",
  Rev: "Rewind",
  Fwd: "Fast Forward",
  InstantReplay: "Instant Replay",
  VolumeUp: "Raise Volume",
  VolumeDown: "Lower Volume",
  VolumeMute: "Toggle Mute",
  PowerOff: "Turn TV Off",
  ChannelUp: "Next Channel",
  ChannelDown: "Previous Channel",
  FindRemote: "Find Remote",
  Backspace: "Delete Character",
  Enter: "Enter",
};

function routineStepPreview(step: RoutineStep): string {
  switch (step.type) {
    case "wake":
      return "Turn TV On and wait for confirmed power state";
    case "launch":
      return `Open ${step.appName || step.appId}`;
    case "key":
      return `${KEY_LABELS[step.key] ?? `Press ${step.key}`}${(step.count ?? 1) > 1 ? ` × ${step.count}` : ""}`;
    case "wait":
      return `Wait ${step.seconds} ${step.seconds === 1 ? "second" : "seconds"}`;
    case "restore":
      return "Restore the activity captured before this routine's first app or Home switch; before such a switch, use its saved previous app or input at run time";
  }
}

/** Display the saved plan in full without changing its stored preview or execution behavior. */
export function formatInstructionPreview(prepared: PreparedInstruction): string[] {
  return prepared.plan.steps.map((step, index) => {
    if (step.kind === "routine") {
      const matching = prepared.routines.filter((routine) => routine.id === step.routineId);
      const routine = matching[0];
      if (matching.length !== 1 || routine.deviceId !== step.deviceId || routine.name !== step.routineName) {
        throw new Error(
          "The saved routine does not match this preview. Preview the instruction again before running it.",
        );
      }
      return [
        `${step.deviceName}: run ${step.routineName}`,
        ...routine.steps.map((routineStep, stepIndex) => `  ${stepIndex + 1}. ${routineStepPreview(routineStep)}`),
      ].join("\n");
    }
    if (step.kind === "restore") {
      return `${step.deviceName}: restore this TV's saved previous app or input at run time. The destination can change before execution.`;
    }
    return prepared.plan.preview[index];
  });
}
