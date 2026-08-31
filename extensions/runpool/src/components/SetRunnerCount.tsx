import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Pool } from "../lib/runpool";

/** runpool's own rule: a whole number from 1 to 9999. */
const MAX_RUNNERS = 9999;

/**
 * Set a pool to an arbitrary runner count.
 *
 * The list offers one up and one down, which is the change people actually
 * make. This exists for everything else, and it exists rather than a longer
 * list of numbers because any fixed range is a ceiling: a pool registered
 * above it could be shrunk from the UI and never restored.
 *
 * Submitting pops first, so the confirmation for a shrink lands over the list
 * rather than over a form the decision has already left.
 *
 * It does not short-circuit when the number is unchanged. `pool` is whatever
 * the row held when the form opened, so an equality test here is against a
 * count something else may have moved since; submitting 4 to a pool that has
 * become 6 would look like a no-op and silently drop the resize. The caller
 * makes that decision from a fresh read instead.
 */
export function SetRunnerCount({ pool, onSubmit }: { pool: Pool; onSubmit: (count: number) => Promise<void> }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  return (
    <Form
      navigationTitle={`Set Runner Count for ${pool.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Runner Count"
            icon={Icon.Gauge}
            onSubmit={async (values: { count: string }) => {
              const count = Number(values.count.trim());
              if (!Number.isInteger(count) || count < 1 || count > MAX_RUNNERS) {
                setError(`A whole number from 1 to ${MAX_RUNNERS}`);
                return;
              }
              pop();
              await onSubmit(count);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={pool.name}
        text={`${pool.count} ${pool.count === 1 ? "runner" : "runners"} now, on ${pool.target}`}
      />
      <Form.TextField
        id="count"
        title="Runners"
        placeholder={String(pool.count)}
        defaultValue={String(pool.count)}
        error={error}
        onChange={() => setError(undefined)}
        info="Growing the pool registers new runners with GitHub and downloads the runner binary. Shrinking deregisters the surplus, which setting the number back does not undo."
      />
    </Form>
  );
}
