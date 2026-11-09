/** Test-only process boundary with a durable Store; does not use Raycast's runtime LocalStorage. */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { Session, Submission } from "../../src/helper";
import { SubmissionController, type PendingRecord, type Store } from "../../src/helpers/submission";

async function main() {
  const input = JSON.parse(readFileSync(0, "utf8")) as {
    action: "start" | "recover";
    mode: PendingRecord["mode"];
    file: string;
    failAcknowledgement?: boolean;
    submission: Submission;
    session: Session;
  };
  const store: Store = {
    getItem: async () => (existsSync(input.file) ? readFileSync(input.file, "utf8") : undefined),
    setItem: async (_, raw) => {
      if (input.failAcknowledgement && JSON.parse(raw).phase === "committed")
        throw Error("injected LocalStorage acknowledgement write failure");
      writeFileSync(input.file, raw);
    },
    removeItem: async () => rmSync(input.file),
  };
  const controller = new SubmissionController(store);
  await controller.load();
  const loaded = structuredClone(controller.record);
  let prepared = false;
  const guard =
    input.action === "recover"
      ? await controller.start(input.mode, async () => {
          prepared = true;
          throw Error("must recover the original command before preparing another");
        })
      : undefined;
  const outcome =
    input.action === "start"
      ? await controller.start(input.mode, async () => input.submission)
      : await controller.recover(input.session);
  process.stdout.write(
    JSON.stringify({ pid: process.pid, loaded, prepared, guard, outcome, record: controller.record }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
