import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { entryKey } from "./api/workspaces";
import CreateIssueForm, { CreateIssueValues } from "./components/CreateIssueForm";
import View from "./components/View";
import { useWorkspaces } from "./components/WorkspaceContext";
import useMe from "./hooks/useMe";
import usePriorities from "./hooks/usePriorities";

// Module-scoped, not component state: the component sits inside the provider's
// key={workspaceKey} remount boundary, so a user changing the Workspace field in a
// draft-opened form remounts Form and would re-run a []-deps effect, re-pinning the
// workspace back and showing a now-false "draft from another workspace" toast (I1).
// Module state survives that remount and dies only with the process — draft pinning is
// a launch-time decision, so "once per launch" is the correct scope, not "once per mount".
let draftPinHandled = false;

function Form({ draftValues }: { draftValues?: CreateIssueValues }) {
  const { entries, activeEntry, pinWorkspace } = useWorkspaces();
  const draftKey = draftValues?.workspaceKey;
  const draftEntry = draftKey ? entries.find((w) => entryKey(w) === draftKey) : undefined;
  const needsPin = Boolean(draftEntry && activeEntry && draftKey !== entryKey(activeEntry));
  const [pinned, setPinned] = useState(!needsPin || draftPinHandled); // draftPinHandled: the launch-time pin already ran; later boundary remounts must not re-gate rendering

  useEffect(() => {
    if (draftPinHandled) return;
    draftPinHandled = true;
    (async () => {
      if (needsPin && draftEntry) {
        // Pin THIS process to the draft's workspace: field, hooks, and submission all
        // target it; the global default stays untouched (D7 — field only, with a toast).
        try {
          await pinWorkspace(draftKey!);
          await showToast({
            style: Toast.Style.Success,
            title: "Draft from another workspace",
            message: `This draft targets ${draftEntry.orgName}; your default workspace is unchanged.`,
          });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: `Could not switch to ${draftEntry.orgName}`,
            message: `Using ${activeEntry?.orgName ?? "the active workspace"} instead: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
        setPinned(true);
      } else if (draftKey && !draftEntry) {
        // Removed workspace (edge case 7): fall back to the active one, keep other values.
        await showToast({
          style: Toast.Style.Failure,
          title: "Draft's workspace is no longer connected",
          message: `Using ${activeEntry?.orgName ?? "the active workspace"} instead.`,
        });
      }
    })();
    // Runs once on mount by design (draft pinning is a launch-time decision).
  }, []);

  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  return (
    <CreateIssueForm
      isLoading={isLoadingPriorities || isLoadingMe || !pinned}
      priorities={priorities}
      me={me}
      enableDrafts
      draftValues={draftValues}
    />
  );
}

export default function Command({ draftValues }: { draftValues?: CreateIssueValues }) {
  return (
    <View>
      <Form draftValues={draftValues} />
    </View>
  );
}
