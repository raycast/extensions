import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useMemo, useState } from "react";
import { spawn } from "node:child_process";

const PATH = "/usr/bin:/bin:/usr/sbin:/opt/homebrew/bin:/opt/homebrew/sbin";

enum Flag {
  Seen = "Seen",
  Answered = "Answered",
  Flagged = "Flagged",
  Deleted = "Deleted",
  Draft = "Draft",
  Recent = "Recent",
  // TODO Custom
}

interface Envelope {
  id: string;
  internal_id: string;
  message_id: string;
  flags: Flag[];
  from: {
    name: string;
    addr: string;
  };
  subject: string;
  date: Date;
}

interface State {
  isLoading: boolean;
  isShowingDetail: boolean;
}
export default function Command() {
  const [state] = useState({
    isLoading: false,
    isShowingDetail: false,
  } as State);

  const exec = useExec("himalaya", ["-o", "json", "list", "-s", "100"], {
    shell: false,
    env: {
      PATH: PATH,
    },
    onError: (error: Error): void => {
      showToast({
        style: Toast.Style.Failure,
        title: `Couldn't fetch envelopes: ${error}`,
      });
    },
  });

  const results = useMemo<any[]>(() => JSON.parse(exec.data || "[]"), [exec.data]);

  const envelopes: Envelope[] = results.map((result) => {
    const envelope: Envelope = {
      id: result.id,
      internal_id: result.internal_id,
      message_id: result.message_id,
      flags: result.flags.map((flag: string) => flag as Flag),
      from: {
        name: result.from.name,
        addr: result.from.addr,
      },
      subject: result.subject,
      date: new Date(result.date),
    };

    return envelope;
  });

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const today = now.toISOString().substring(0, 10);

  const groups = envelopes.reduce((acc, val) => {
    const s = val.date.toISOString().substring(0, 10);

    const date = (() => {
      switch (s) {
        case today:
          return "Today";
        case yesterday:
          return "Yesterday";
        default:
          return s;
      }
    })();

    const envelopes: Envelope[] | undefined = acc.get(date);

    if (envelopes) {
      // Get and update the list
      envelopes.push(val);
      acc.set(date, envelopes);
    } else {
      acc.set(date, [val]);
    }

    return acc;
  }, new Map<string, Envelope[]>());

  const accessories = (envelope: Envelope) => {
    const accessories = [];

    if (envelope.flags.includes(Flag.Seen)) {
      accessories.push({
        icon: { source: { light: "envelope.open-light-Regular-S.png", dark: "envelope.open-dark-Regular-S.png" } },
      });
    }

    if (!envelope.flags.includes(Flag.Seen)) {
      accessories.push({
        icon: { source: { light: "envelope.badge-light-Regular-S.png", dark: "envelope.badge-dark-Regular-S.png" } },
      });
    }

    if (envelope.flags.includes(Flag.Answered)) {
      accessories.push({
        icon: {
          source: {
            light: "arrowshape.turn.up.left-light-Regular-S.png",
            dark: "arrowshape.turn.up.left-dark-Regular-S.png",
          },
        },
      });
    }

    // This is always present. Accessories are rendered ordered
    // so put them last.
    accessories.push({
      text: {
        value: `${envelope.from.name} <${envelope.from.addr}>`,
      },
      icon: { source: "person-Regular-S.png" },
    });

    return accessories;
  };

  const markUnreadAction = (envelope: Envelope) => {
    return (
      <Action
        title="Mark Unread"
        style={Action.Style.Regular}
        icon={{
          source: { light: "envelope.badge-light-Regular-S.png", dark: "envelope.badge-dark-Regular-S.png" },
        }}
        onAction={async () => {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Marking as unread",
          });

          const cmd = spawn("himalaya", ["flag", "remove", envelope.id, "--", "seen"], {
            env: {
              PATH: PATH,
            },
          });

          cmd.stdout.on("data", (_data) => {
            toast.style = Toast.Style.Success;
            toast.title = "Marked unread";
          });

          cmd.stderr.on("data", (data) => {
            console.error(`stderr: ${data}`);

            toast.style = Toast.Style.Failure;
            toast.title = `Failed to mark unread: ${data}`;
          });

          cmd.on("close", (code) => {
            if (code == 0) {
              toast.style = Toast.Style.Success;
              toast.title = "Marked unread";
            } else {
              console.error(`child process exited with code ${code}`);

              toast.style = Toast.Style.Failure;
              toast.title = `Failed to mark seen: ${code}`;
            }
          });
        }}
      />
    );
  };

  const markReadAction = (envelope: Envelope) => {
    return (
      <Action
        title="Mark Read"
        style={Action.Style.Regular}
        icon={{
          source: { light: "envelope.open-light-Regular-S.png", dark: "envelope.open-dark-Regular-S.png" },
        }}
        onAction={async () => {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Marking as read",
          });

          const cmd = spawn("himalaya", ["flag", "add", envelope.id, "--", "seen"], {
            env: {
              PATH: PATH,
            },
          });

          cmd.stdout.on("data", (_data) => {
            toast.style = Toast.Style.Success;
            toast.title = "Marked read";
          });

          cmd.stderr.on("data", (data) => {
            console.error(`stderr: ${data}`);

            toast.style = Toast.Style.Failure;
            toast.title = `Failed to mark read: ${data}`;
          });

          cmd.on("close", (code) => {
            if (code == 0) {
              toast.style = Toast.Style.Success;
              toast.title = "Marked read";
            } else {
              console.error(`child process exited with code ${code}`);

              toast.style = Toast.Style.Failure;
              toast.title = `Failed to mark seen: ${code}`;
            }
          });
        }}
      />
    );
  };

  const moveToTrashAction = (envelope: Envelope) => {
    return (
      <Action
        title="Move to Trash"
        style={Action.Style.Destructive}
        icon={{
          source: { light: "envelope-light-Regular-S.png", dark: "envelope-dark-Regular-S.png" },
        }}
        onAction={async () => {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Moving to trash",
          });

          const cmd = spawn("himalaya", ["delete", envelope.id], {
            env: {
              PATH: PATH,
            },
          });

          cmd.stdout.on("data", (_data) => {
            toast.style = Toast.Style.Success;
            toast.title = "Moved to trash";
          });

          cmd.stderr.on("data", (data) => {
            console.error(`stderr: ${data}`);

            toast.style = Toast.Style.Failure;
            toast.title = `Failed to move to trash: ${data}`;
          });

          cmd.on("close", (code) => {
            if (code == 0) {
              toast.style = Toast.Style.Success;
              toast.title = "Moved to trash";
            } else {
              console.error(`child process exited with code ${code}`);

              toast.style = Toast.Style.Failure;
              toast.title = `Failed to move to trash: ${code}`;
            }
          });
        }}
      />
    );
  };

  // {!envelope.flags.includes(Flag.Seen) && }
  // {envelope.flags.includes(Flag.Seen) }

  const sections = Array.from(groups.entries()).map(([date, group]) => {
    const items = group.map((envelope) => {
      const item = (
        <List.Item
          id={envelope.id}
          key={envelope.id}
          title={envelope.subject}
          accessories={accessories(envelope)}
          actions={
            <ActionPanel title="Envelope">
              <Action.CopyToClipboard title="Copy ID to Clipboard" content={envelope.id} />
              {markUnreadAction(envelope)}
              {markReadAction(envelope)}
              {moveToTrashAction(envelope)}
            </ActionPanel>
          }
        />
      );

      return item;
    });

    const section = (
      <List.Section title={date} key={date}>
        {items}
      </List.Section>
    );

    return section;
  });

  return (
    <List isLoading={exec.isLoading} isShowingDetail={state.isShowingDetail}>
      {sections}
    </List>
  );
}
