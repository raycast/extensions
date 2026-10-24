import { Action, ActionPanel, Detail, Icon, Keyboard, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { checkMarkdown, parsePort, stoppable } from "./lib/model";
import { check } from "./lib/portcheck";
import { binary } from "./lib/raycast";
import { stopProcess } from "./stop";

export default function CheckPort(props: LaunchProps<{ arguments: Arguments.CheckPort }>) {
  const port = parsePort(props.arguments.port);
  const { data, isLoading, error, revalidate } = usePromise(
    async (p: number | undefined) => (p === undefined ? undefined : check(binary(), p)),
    [port],
  );

  if (port === undefined) {
    return <Detail markdown={`# "${props.arguments.port}" isn't a port\n\nGive a number from 1 to 65535.`} />;
  }
  if (error) {
    return <Detail markdown={`# portcheck failed\n\n${error.message}`} />;
  }
  const targets = data ? stoppable(port, data) : [];
  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? checkMarkdown(port, data) : `Checking port ${port}…`}
      actions={
        <ActionPanel>
          {targets.map((t) => (
            <Action
              key={t.pid}
              title={`Stop ${t.name} (PID ${t.pid})`}
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={async () => {
                if (await stopProcess(t)) revalidate();
              }}
            />
          ))}
          <Action.OpenInBrowser url={`http://localhost:${port}/`} shortcut={Keyboard.Shortcut.Common.Open} />
          <Action
            title="Check Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
