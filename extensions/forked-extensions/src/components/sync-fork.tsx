import { useEffect, useState } from "react";
import { Action, Icon, confirmAlert, useNavigation } from "@raycast/api";
import * as api from "../api.js";
import Diagnostics from "./diagnostics.js";
import { catchError, handleError } from "../errors.js";
import operation from "../operation.js";
import { getCommitsText } from "../utils.js";

export default function SyncFork({
  forkedRepository,
  lastCommitHash,
  onSyncFinished,
}: {
  forkedRepository: string | undefined;
  lastCommitHash: string | undefined;
  onSyncFinished: () => void;
}) {
  const [behindBy, setBehindBy] = useState(0);
  const { push } = useNavigation();

  useEffect(() => {
    if (!forkedRepository) return;
    api
      .compareTwoCommits(forkedRepository)
      .then((count) => {
        setBehindBy(count);
      })
      .catch((error) => {
        handleError(error, {
          primaryAction: {
            title: "Run Diagnostics",
            onAction: () => {
              push(<Diagnostics />);
            },
          },
        });
      });
  }, [forkedRepository, lastCommitHash]);

  return (
    <Action
      icon={Icon.Repeat}
      title={`Sync Fork${behindBy > 0 ? ` (${getCommitsText(behindBy)} behind)` : ""}`}
      onAction={async () => {
        const yes = await confirmAlert({
          title: "Sync Fork",
          message:
            "This will update the main branch of your forked repository to match the upstream repository on both GitHub and your local machine. Do you want to continue?",
          primaryAction: { title: "Sync" },
        });
        if (yes) {
          catchError(async () => {
            await operation.sync();
            onSyncFinished?.();
          })();
        }
      }}
    />
  );
}
