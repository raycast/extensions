export function formatWorkItemIdentifier(
  projectIdentifier: string | undefined,
  sequenceId: number | string | undefined,
) {
  return `${projectIdentifier ?? "?"}-${sequenceId ?? "?"}`;
}
