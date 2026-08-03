import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCurrentSpace } from "./lib/native";
import { nameForId, setSpaceName } from "./lib/spaceNames";
import { SpaceInfo } from "./lib/format";

export default function Command() {
  const [space, setSpace] = useState<SpaceInfo>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setSpace(getCurrentSpace());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  if (error) {
    return (
      <Form isLoading={loading}>
        <Form.Description title="Could not read the current space" text={error} />
      </Form>
    );
  }

  return (
    <Form
      isLoading={loading}
      actions={
        space ? (
          <ActionPanel>
            <Action.SubmitForm
              title="Save Name"
              icon={Icon.Check}
              onSubmit={async (values: { name: string }) => {
                if (space.id != null) setSpaceName(space.id, values.name);
                await showToast({
                  style: Toast.Style.Success,
                  title: values.name.trim() ? `Named "${values.name.trim()}"` : "Name cleared",
                });
                await popToRoot();
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {space && (
        <>
          <Form.Description text={`Current space: Space ${space.index} · Display ${space.display}`} />
          <Form.TextField
            id="name"
            title="Name"
            placeholder="e.g. Work, Comms, Design"
            defaultValue={nameForId(space.id) ?? ""}
            autoFocus
          />
        </>
      )}
    </Form>
  );
}
