import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import assert from "assert";
import { Fragment } from "react/jsx-runtime";

export default function generateNewCommitMessage() {
  const { data, isLoading, revalidate } = useFetch("https://whatthecommit.com/index.txt", {
    failureToastOptions: {
      message: "Failed to fetch commit message",
    },
    keepPreviousData: false,
  });

  assert(typeof data === "string");

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${data}`}
      actions={
        <ActionPanel>
          <Action title="Generage New Commit Message" onAction={revalidate} icon={Icon.RotateClockwise} />
          {data ? (
            <Fragment>
              <Action.CopyToClipboard
                title="Copy Commit Message"
                content={data}
                shortcut={{ key: "c", modifiers: ["cmd"] }}
                icon={Icon.Clipboard}
              />
              <Action.Paste
                title="Paste the Commit Message in Active Tab"
                content={data}
                shortcut={{ key: "v", modifiers: ["cmd"] }}
                icon={Icon.Pencil}
              />
            </Fragment>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

// export default function Command() {
//   return <Detail markdown="# Hello World" />;
// }
