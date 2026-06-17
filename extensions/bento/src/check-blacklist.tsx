import React, { useState } from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast, Detail } from "@raycast/api";
import { checkBlacklist, BlacklistResponse } from "./api-client";

interface FormValues {
  domain?: string;
  ip?: string;
}

interface BlacklistResult extends BlacklistResponse {
  query: string;
  description: string;
  results: Record<string, boolean | string>;
}

export default function CheckBlacklist() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const result = await checkBlacklist(values.domain, values.ip);
      const blacklistResult: BlacklistResult = {
        ...result,
        query: values.domain || values.ip || "",
        description: `Blacklist check for ${values.domain ? "domain" : "IP"}: ${values.domain || values.ip}`,
        results: {
          blacklisted: result.blacklisted,
          listings: result.listings.join(", "),
        },
      };
      push(<ResultView result={blacklistResult} />);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="domain" title="Domain" placeholder="Enter domain to check" />
      <Form.TextField id="ip" title="IP Address" placeholder="Enter IP address to check" />
    </Form>
  );
}

function ResultView({ result }: { result: BlacklistResult }) {
  const markdown = `
# Blacklist Check Result

- Query: ${result.query}
- Description: ${result.description}

## Results
${Object.entries(result.results)
  .map(([key, value]) => `- ${key}: ${String(value)}`)
  .join("\n")}
  `;

  return <Detail markdown={markdown} />;
}
