import { ActionPanel, Detail } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { RefreshAction } from "./Actions";
import { readFile } from "node:fs/promises";
import path from "node:path";

export default function InstalledModSourceCode({ id, name }: { id: string; name: string }) {
  const {
    isLoading,
    data: source,
    error,
    revalidate,
  } = usePromise(async () => {
    const filePath = path.join("C:", "ProgramData", "Windhawk", "ModsSource", `${id}.wh.cpp`);
    const file = await readFile(filePath, "utf8");
    return file;
  });

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not get source code for ${id}` });
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${name} — Source Code`}
      markdown={isLoading ? `## _Loading…_` : `# ${name} Source Code\n\n\`\`\`cpp\n${source}\n\`\`\``}
      actions={
        <ActionPanel>
          <RefreshAction revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}
