import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import {
  MicrophonePermission,
  Recorder,
  RecorderExit,
  RecorderLauncher,
  type RecorderEvents,
  type RecorderProcess,
} from "../src/lib/recorder.ts"

/** A stand-in for the Swift recorder process. */
export class FakeRecorder {
  finished = false
  killed = false
  private readonly script: Array<(events: RecorderEvents) => void> = []

  /** `exitOnFinish` is false for a recorder that hangs when told to stop. */
  constructor(private readonly exitOnFinish = true) {}

  /** Queue audio chunks to send once the recorder starts. */
  speak(...chunks: ReadonlyArray<Uint8Array>) {
    this.script.push((events) => chunks.forEach(events.audio))
    return this
  }

  /** Queue an exit to report once the recorder starts. */
  exitWith(exit: RecorderExit) {
    this.script.push((events) => events.exit(exit))
    return this
  }

  /** Called by the fake launcher. The script plays on a later tick, like a real process. */
  start(events: RecorderEvents): RecorderProcess {
    setImmediate(() => this.script.forEach((step) => step(events)))
    return {
      finish: () => {
        this.finished = true
        if (this.exitOnFinish) setImmediate(() => events.exit(RecorderExit.Finished()))
      },
      kill: () => {
        this.killed = true
        events.exit(RecorderExit.Failed({ message: "killed" }))
      },
    }
  }
}

/** PCM bytes for the given 16-bit samples. */
export const chunk = (...samples: ReadonlyArray<number>) => {
  const view = new DataView(new ArrayBuffer(samples.length * 2))
  samples.forEach((sample, index) => view.setInt16(index * 2, sample, true))
  return new Uint8Array(view.buffer)
}

/** `Recorder` with microphone access allowed and `recorder` as the process. */
export const fakeRecorderLayer = (recorder: FakeRecorder) =>
  Recorder.layer.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        Layer.succeed(
          MicrophonePermission,
          MicrophonePermission.of({
            status: Effect.succeed("authorized"),
            request: Effect.succeed(true),
          }),
        ),
        Layer.succeed(
          RecorderLauncher,
          RecorderLauncher.of({ start: (_args, events) => recorder.start(events) }),
        ),
      ),
    ),
  )
