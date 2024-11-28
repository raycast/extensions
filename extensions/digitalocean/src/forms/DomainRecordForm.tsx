import { ActionPanel, Action, Form, popToRoot } from "@raycast/api";
import { DomainRecord, useMutateDomainRecords } from "../client";
import { useCallback, useState } from "react";

export default function DomainRecordForm({ domain, type }: { domain: string; type: DomainRecord["type"] }) {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; statusCode?: number } | null>(null);
  const { mutate } = useMutateDomainRecords(domain);
  const onSubmit = useCallback((values: Pick<DomainRecord, "name" | "data" | "ttl"> & Partial<DomainRecord>) => {
    setLoading(true);
    mutate({ type, ...values })
      .then(() => popToRoot())
      .catch((e) => setError({ message: e.message, statusCode: e.response?.status }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Form
      navigationTitle={`Add ${type} Record`}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Description title="Domain" text={domain} />
      <Form.TextField id="name" title="Hostname (non-qualified)" />
      <Form.TextField
        id="data"
        title={type === "A" ? "Will Direct To" : type === "CNAME" ? "Is An Alias Of" : "Value"}
      />
      <Form.TextField id="ttl" title="TTL (seconds)" defaultValue={"1800"} />
      {type === "SRV" || type === "MX" ? <Form.TextField id="priority" title="Priority" defaultValue={"10"} /> : null}
      {type === "SRV" ? <Form.TextField id="port" title="Port" defaultValue={"80"} /> : null}
      {type === "SRV" ? <Form.TextField id="weight" title="Weight" defaultValue={"10"} /> : null}
      {error && (
        <Form.Description
          text={
            error.statusCode === 403
              ? "Please provide a write-access token in extension settings."
              : `FAILED: ${error.message}`
          }
        />
      )}
    </Form>
  );
}
