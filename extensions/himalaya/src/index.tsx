import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import child_process = require("node:child_process");
import util = require("node:util");

const exec: any = util.promisify(child_process.exec);

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
  envelopes: Envelope[];
}

export default function ListEnvelopes() {
  const [state, setState] = useState({
    isLoading: true,
    envelopes: [],
  } as State);

  useEffect(() => {
    async function fetch() {
      const envelopes = await listEnvelopes();

      setState((previous) => ({ ...previous, envelopes: envelopes, isLoading: false }));
    }

    fetch();
  }, []);

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

          try {
            const { stdout, _stderr } = await exec(`"himalaya" flag remove ${envelope.id} -- seen`, {
              env: {
                PATH: PATH,
              },
            });

            toast.style = Toast.Style.Success;
            toast.title = "Marked unread";

            setState((previous) => ({ ...previous, isLoading: true }));
            const envelopes = await listEnvelopes();
            setState((previous) => ({ ...previous, envelopes: envelopes, isLoading: false }));
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = `Failed to mark unread: ${error}`;
          }
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

          try {
            const { stdout, _stderr } = await exec(`"himalaya" flag add ${envelope.id} -- seen`, {
              env: {
                PATH: PATH,
              },
            });

            toast.style = Toast.Style.Success;
            toast.title = "Marked read";

            setState((previous) => ({ ...previous, isLoading: true }));
            const envelopes = await listEnvelopes();
            setState((previous) => ({ ...previous, envelopes: envelopes, isLoading: false }));
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = `Failed to mark read: ${error}`;
          }
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

          try {
            const { stdout, _stderr } = await exec(`"himalaya" delete ${envelope.id}`, {
              env: {
                PATH: PATH,
              },
            });

            toast.style = Toast.Style.Success;
            toast.title = "Moved to trash";

            setState((previous) => ({ ...previous, isLoading: true }));
            const envelopes = await listEnvelopes();
            setState((previous) => ({ ...previous, envelopes: envelopes, isLoading: false }));
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = `Failed to move to trash: ${error}`;
          }
        }}
      />
    );
  };

  return (
    <List isLoading={state.isLoading}>
      {Array.from(group_envelopes_by_date(state.envelopes).entries()).map(([date, group]) => {
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
      })}
    </List>
  );
}

const group_envelopes_by_date = (envelopes: Envelope[]) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const today = now.toISOString().substring(0, 10);

  const groups = envelopes.reduce((acc, val) => {
    const date = val.date.toISOString().substring(0, 10);

    const date_distance = (() => {
      switch (date) {
        case today:
          return "Today";
        case yesterday:
          return "Yesterday";
        default:
          return date;
      }
    })();

    const envelopes: Envelope[] | undefined = acc.get(date_distance);

    if (envelopes) {
      // Get and update_distance the list
      envelopes.push(val);
      acc.set(date_distance, envelopes);
    } else {
      acc.set(date_distance, [val]);
    }

    return acc;
  }, new Map<string, Envelope[]>());

  return groups;
};

async function listEnvelopes(): Promise<Envelope[]> {
  const { stdout, stderr } = await exec('"himalaya" -o json list -s 100', {
    env: {
      PATH: PATH,
    },
  });

  if (stdout) {
    const results = JSON.parse(stdout);

    const envelopes: Envelope[] = results.map((result: any) => {
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

    return envelopes;
  }

  if (stderr) {
    console.log(stderr);

    return [];
  }

  throw new Error("No results from stdout or stderr");
}
