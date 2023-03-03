import { Action, Icon, showToast } from "@raycast/api";
import { mastodon } from "masto";
import { useState } from "react";

interface Props {
  reblogged: boolean;
  id: string;
  masto: mastodon.Client | undefined;
}

export default function ReblogAction({ reblogged: providedReblogged, id, masto }: Props) {
  const [reblogged, setReblogged] = useState(providedReblogged);

  return (
    <Action
      title="Reblog"
      icon={reblogged ? Icon.BoltDisabled : Icon.Bolt}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={async () => {
        if (reblogged) await masto?.v1.statuses.unreblog(id);
        else await masto?.v1.statuses.reblog(id);
        showToast({ title: `Successfully ${reblogged ? "reblogged" : "unreblogged"}!` });
				setReblogged(v => !v)
      }}
    />
  );
}
