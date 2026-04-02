export type PasteTextExecutor = (text: string) => Promise<void>;
export type CloseWindowExecutor = () => Promise<void>;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function pasteTextToFrontmostApp(
  text: string,
  pasteExecutor: PasteTextExecutor,
  closeWindowExecutor?: CloseWindowExecutor,
  waitMilliseconds = 120,
): Promise<void> {
  if (!pasteExecutor) {
    throw new Error(
      "Failed to paste back into source app: missing paste executor",
    );
  }

  try {
    if (closeWindowExecutor) {
      await closeWindowExecutor();
      if (waitMilliseconds > 0) {
        await sleep(waitMilliseconds);
      }
    }

    await pasteExecutor(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to paste back into source app: ${message}`);
  }
}
