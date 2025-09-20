import { Detail, ActionPanel, Action } from "@raycast/api";
import util from "util";
import { exec } from "child_process";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";

const execp = util.promisify(exec);

function highlightNumbersInMarkdown(markdown: string): string {
  const numberRegex = /(\b(\d|:|\.)+\b)/g;

  const highlighted = markdown.replace(numberRegex, "**$1**");

  return highlighted;
}

export default function Command() {
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate } = usePromise(
    async () => {
      const response = await execp("uptime");
      const result = highlightNumbersInMarkdown(await response.stdout.toString());
      return result;
    },
    [],
    {
      abortable,
    }
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={`Uptime: ${data}`}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}
