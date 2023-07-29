import { Detail, ActionPanel, Action } from "@raycast/api";
const util = require('util');
const exec = util.promisify(require('child_process').exec);
import { usePromise } from "@raycast/utils";
import { log } from "console";
import { useRef } from "react";

function highlightNumbersInMarkdown(markdown: string): string {
  const numberRegex = /(\b(\d|\:|\.)+\b)/g;

  const highlighted = markdown.replace(numberRegex, '**$1**');

  return highlighted;
}

export default function Command() {
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate } = usePromise(
    async () => {
      const response = await exec("uptime")
      const result = highlightNumbersInMarkdown(await response.stdout.toString());
      return result;
    },
    [],
    {
      abortable,
    }
  );

  return <Detail
  isLoading={isLoading}
  markdown={`Uptime: ${data}`}
  actions={
    <ActionPanel>
      <Action title="Reload" onAction={() => revalidate()} />
    </ActionPanel>
  }
/>;
}
