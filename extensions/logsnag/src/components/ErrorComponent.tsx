import { Action, ActionPanel, List } from "@raycast/api";
import { ErrorResponse } from "../utils/types";
import { useState } from "react";

type Props = {
  errorResponse: ErrorResponse;
};
export default function ErrorComponent({ errorResponse }: Props) {
  const [showAccessories, setShowAccessories] = useState(true);

  return (
    <List navigationTitle="Errors">
      <List.Section title={errorResponse.message}>
        {errorResponse.validation.body?.map((error) => (
          <List.Item
            key={error.message}
            title={error.message}
            actions={
              <ActionPanel>
                <Action title="Toggle Accessories" onAction={() => setShowAccessories(!showAccessories)} />
              </ActionPanel>
            }
            accessories={
              !showAccessories ? undefined : [{ tag: `path: ${error.path}` }, { tag: `type: ${error.type}` }]
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
