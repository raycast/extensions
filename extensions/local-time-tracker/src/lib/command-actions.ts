export type FailureReporter = (title: string, error: unknown) => Promise<void>;

export async function launchWithFailure(
  launch: () => Promise<void>,
  failureTitle: string,
  reportFailure: FailureReporter,
): Promise<void> {
  try {
    await launch();
  } catch (error) {
    await reportFailure(failureTitle, error);
  }
}
