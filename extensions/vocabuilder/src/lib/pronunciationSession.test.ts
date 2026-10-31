import { afterEach, describe, expect, it } from "vitest";
import { createPronunciationSession } from "./pronunciationSession";
import { runSystemVoice } from "./pronounceFlow";

const sessions: ReturnType<typeof createPronunciationSession>[] = [];

function session() {
  const created = createPronunciationSession();
  sessions.push(created);
  return created;
}

afterEach(() => {
  for (const current of sessions.splice(0)) current.cancel();
});

describe("pronunciation sessions", () => {
  it("switching between Word and Translation stops the other action's system voice", async () => {
    const word = session();
    const translation = session();
    const speak = (signal: AbortSignal) =>
      runSystemVoice({
        signal,
        attempt: () =>
          new Promise<void>((_, reject) => {
            signal.addEventListener("abort", () => reject(new Error("cancelled speech")), { once: true });
          }),
      });

    const wordSpeaking = speak(word.start());
    const translationSpeaking = speak(translation.start());
    expect(await wordSpeaking).toEqual({ kind: "aborted" });

    const nextWord = word.start();
    expect(await translationSpeaking).toEqual({ kind: "aborted" });
    expect(nextWord.aborted).toBe(false);
  });

  it("repeating an action cancels its previous pronunciation", () => {
    const action = session();
    const first = action.start();
    const second = action.start();
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
  });

  it("unmounting an older action does not cancel the other action now speaking", () => {
    const word = session();
    const translation = session();
    word.start();
    const signal = translation.start();
    word.cancel();
    expect(signal.aborted).toBe(false);
    translation.cancel();
    expect(signal.aborted).toBe(true);
  });

  it("finishing an older action leaves the newer pronunciation available for cancellation", () => {
    const word = session();
    const translation = session();
    const oldSignal = word.start();
    const newSignal = translation.start();
    word.finish(oldSignal);
    session().start();
    expect(newSignal.aborted).toBe(true);
  });

  it("finishing a superseded request on the same action does not release its current request", () => {
    const action = session();
    const oldSignal = action.start();
    const newSignal = action.start();
    action.finish(oldSignal);
    action.cancel();
    expect(newSignal.aborted).toBe(true);
  });

  it("releases completed speech without cancelling it when another action starts", () => {
    const action = session();
    const signal = action.start();
    action.finish(signal);
    session().start();
    expect(signal.aborted).toBe(false);
  });
});
