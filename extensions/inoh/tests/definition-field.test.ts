import "./support/act-environment";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDefinitionField } from "../src/hooks/useDefinitionField";
import { SUGGEST_AFTER_IDLE_MS } from "../src/hooks/useSuggestedDefinition";
import { suggestDefinition, type DefinitionSuggestionAnswer } from "../src/lib/suggested-definitions";

vi.mock("../src/lib/suggested-definitions", () => ({ suggestDefinition: vi.fn() }));

const APPLE_DEFINITION = "a round fruit";
const BANANA_DEFINITION = "a long yellow fruit";

type DefinitionField = ReturnType<typeof useDefinitionField>;

function createPendingAnswer() {
  let resolveAnswer!: (answer: DefinitionSuggestionAnswer) => void;
  const promise = new Promise<DefinitionSuggestionAnswer>((resolve) => {
    resolveAnswer = resolve;
  });
  return { promise, resolveAnswer };
}

describe("Generate definition field", () => {
  let renderer: ReactTestRenderer | undefined;
  let definitionField: DefinitionField;

  function DefinitionFieldProbe({ word, isSignedIn }: { word: string; isSignedIn: boolean }) {
    definitionField = useDefinitionField(word, isSignedIn);
    return null;
  }

  async function renderWord(word: string, isSignedIn = true) {
    await act(async () => {
      const element = createElement(DefinitionFieldProbe, { word, isSignedIn });
      if (renderer) renderer.update(element);
      else renderer = create(element);
    });
  }

  async function finishTypingDelay() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SUGGEST_AFTER_IDLE_MS);
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(suggestDefinition).mockReset();
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = undefined;
    vi.useRealTimers();
  });

  it("ignores the previous word's answer before the new word's request starts", async () => {
    const appleAnswer = createPendingAnswer();
    const bananaAnswer = createPendingAnswer();
    vi.mocked(suggestDefinition).mockReturnValueOnce(appleAnswer.promise).mockReturnValueOnce(bananaAnswer.promise);

    await renderWord("apple");
    await finishTypingDelay();
    expect(suggestDefinition).toHaveBeenCalledWith("apple");

    await renderWord("banana");
    await act(async () => {
      appleAnswer.resolveAnswer({ definition: APPLE_DEFINITION, hasServiceAnswered: true });
    });

    expect(suggestDefinition).toHaveBeenCalledTimes(1);
    expect(definitionField.definition).toBe("");
    expect(definitionField.definitionPlaceholder).toBe("Definition");

    await finishTypingDelay();
    expect(suggestDefinition).toHaveBeenLastCalledWith("banana");
    await act(async () => {
      bananaAnswer.resolveAnswer({ definition: BANANA_DEFINITION, hasServiceAnswered: true });
    });
    expect(definitionField.definition).toBe(BANANA_DEFINITION);
    expect(definitionField.isStillSuggested).toBe(true);
  });

  it("clears an untouched suggestion when the word changes", async () => {
    vi.mocked(suggestDefinition).mockResolvedValue({ definition: APPLE_DEFINITION, hasServiceAnswered: true });
    await renderWord("apple");
    await finishTypingDelay();
    expect(definitionField.definition).toBe(APPLE_DEFINITION);

    await renderWord("banana");
    expect(definitionField.definition).toBe("");
    expect(definitionField.definitionPlaceholder).toBe("Definition");
  });

  it("preserves a definition the user wrote while the request was pending", async () => {
    const appleAnswer = createPendingAnswer();
    vi.mocked(suggestDefinition).mockReturnValue(appleAnswer.promise);
    await renderWord("apple");
    await finishTypingDelay();
    await act(async () => definitionField.setDefinition("a technology company"));
    await act(async () => {
      appleAnswer.resolveAnswer({ definition: APPLE_DEFINITION, hasServiceAnswered: true });
    });
    await renderWord("banana");
    expect(definitionField.definition).toBe("a technology company");
    expect(definitionField.isStillSuggested).toBe(false);
  });

  it.each([
    { word: "", isSignedIn: true },
    { word: "apple", isSignedIn: false },
  ])("ignores a pending answer after changing to $word with signed-in state $isSignedIn", async (nextState) => {
    const appleAnswer = createPendingAnswer();
    vi.mocked(suggestDefinition).mockReturnValue(appleAnswer.promise);
    await renderWord("apple");
    await finishTypingDelay();
    await renderWord(nextState.word, nextState.isSignedIn);
    await act(async () => {
      appleAnswer.resolveAnswer({ definition: APPLE_DEFINITION, hasServiceAnswered: true });
    });
    await finishTypingDelay();
    expect(definitionField.definition).toBe("");
    expect(definitionField.definitionPlaceholder).toBe("Definition");
    expect(suggestDefinition).toHaveBeenCalledTimes(1);
  });
});
