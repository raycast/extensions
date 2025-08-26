import { useEffect, useState } from "react";
import { Action, Icon, confirmAlert } from "@raycast/api";
import * as api from "../api.js";
import operation from "../operation.js";

export default function SyncFork({ forkedRepository }: { forkedRepository?: string }) {
  const [behindBy, setBehindBy] = useState(0);

  useEffect(() => {
    if (!forkedRepository) return;
    api.compareTwoCommits(forkedRepository).then((count) => {
      setBehindBy(count);
    });
  }, [forkedRepository]);

  return (
    <Action
      icon={Icon.Repeat}
      title={`Sync Fork${behindBy > 0 ? ` (${behindBy} commit${behindBy > 1 ? "s" : ""} behind)` : ""}`}
      onAction={async () => {
        const yes = await confirmAlert({
          title: "Sync Fork",
          message:
            "This will update the main branch of your forked repository to match the upstream repository on both GitHub and your local machine. Do you want to continue?",
          primaryAction: { title: "Sync" },
        });
        if (yes) await operation.sync();
      }}
    />
  );
}
