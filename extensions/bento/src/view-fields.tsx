import { useEffect, useState } from "react";
import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getFields, Field } from "./api-client";

export default function ViewFields() {
  const [fields, setFields] = useState<Field[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFields() {
      try {
        const fetchedFields = await getFields();
        setFields(fetchedFields);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to fetch fields");
      } finally {
        setIsLoading(false);
      }
    }
    fetchFields();
  }, []);

  return (
    <List isLoading={isLoading}>
      {fields.map((field) => (
        <List.Item
          key={field.id}
          title={field.name}
          subtitle={`Key: ${field.key}`}
          accessories={[
            {
              text: field.whitelisted === "true" ? "Whitelisted" : "Not Whitelisted",
            },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={field.key} title="Copy Field Key" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
