import { randomUUID } from "node:crypto";
import type { Entity, Session } from "../helper";
import { eligible, prepareTrash, preflightEdit } from "./edit";
import type { Outcome, SubmissionController } from "./submission";

export type TrashSnapshot = { entity: Entity; session: Session };

/** List actions read before confirmation; editors supply their original snapshot. */
export async function requestTrash(
  controller: SubmissionController,
  load: () => Promise<TrashSnapshot>,
  confirm: (entity: Entity) => Promise<boolean>,
): Promise<Outcome | undefined> {
  let cancelled = false;
  const outcome = await controller.start("edit", async () => {
    const snapshot = await load();
    eligible(snapshot.entity);
    if (!(await confirm(snapshot.entity))) {
      cancelled = true;
      return null;
    }
    const pending = prepareTrash(snapshot.entity, randomUUID(), snapshot.session);
    await preflightEdit(pending);
    return pending;
  });
  return cancelled ? undefined : outcome;
}
