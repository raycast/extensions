import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { readHostsFile } from "./lib/hosts-file";
import { strings } from "./lib/strings";

export function HostsDetail() {
  const [content, setContent] = useState<string>();
  const [error, setError] = useState<string>();
  const s = strings;

  useEffect(() => {
    readHostsFile()
      .then(setContent)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      );
  }, []);

  if (error) {
    return (
      <Detail
        navigationTitle={s.currentHostsFile}
        markdown={`${s.failedToReadHosts}\n\n\`\`\`\n${error}\n\`\`\``}
      />
    );
  }

  return (
    <Detail
      isLoading={content === undefined}
      navigationTitle={s.currentHostsFile}
      markdown={content === undefined ? "" : `\`\`\`\n${content}\n\`\`\``}
    />
  );
}
