export async function openProject(open: () => Promise<void>, close: () => Promise<void>): Promise<void> {
  await open();
  try {
    await close();
  } catch {
    // The project has already opened; failing to close Raycast is non-fatal.
  }
}
