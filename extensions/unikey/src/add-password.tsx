import { useState } from "react";
import EntryForm from "./entry-form";
import UnlockView from "./unlock";
import { vaultPath } from "./preferences";
import { groupsSorted } from "./query";
import { isUnlocked, loadOrThrow } from "./session";
import { vaultExists } from "./vault";

/**
 * Jumps straight into the Add Password form.
 * Falls back to the unlock/create view when the vault isn't unlocked yet.
 */
export default function AddPasswordCommand() {
  const dir = vaultPath();
  const [unlocked, setUnlocked] = useState(() => isUnlocked() && vaultExists(dir));

  if (!unlocked) return <UnlockView dir={dir} onUnlocked={() => setUnlocked(true)} />;

  const vault = loadOrThrow(dir);
  const groups = groupsSorted(vault).map((g) => g.name);

  return <EntryForm dir={dir} groups={groups} onSaved={() => setUnlocked(true)} />;
}
