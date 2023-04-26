import { Form, Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { retrieveSSLBundle } from "./utils/api";
import { RetrieveSSLBundleResponse } from "./utils/types";

export default function RetrieveBundle() {
  type RetrieveSSLFormValues = {
    domain: string;
  };
  const [isLoading, setIsLoading] = useState(false);
  const [ssl, setSSL] = useState<RetrieveSSLBundleResponse>();
  const { handleSubmit, itemProps } = useForm<RetrieveSSLFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const { domain } = values;
      const response = (await retrieveSSLBundle(domain)) as RetrieveSSLBundleResponse;
      if (response.status === "SUCCESS") {
        setSSL(response);
        showToast({
          style: Toast.Style.Success,
          title: "SUCCESS",
          message: `Retrieved SSL bundle for '${domain}'`,
        });
      }
      setIsLoading(false);
    },
    validation: {
      domain: FormValidation.Required,
    },
  });

  return !ssl ? (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Submit" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Go to API Reference"
            url="https://porkbun.com/api/json/v3/documentation#SSL%20Retrieve%20Bundle%20by%20Domain"
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="Enter domain" {...itemProps.domain} />
    </Form>
  ) : (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Entire SSL Bundle"
            content={`
# Intermediate Certificate

${ssl.intermediatecertificate}

# Certificate Chain

${ssl.certificatechain}

# Private Key

${ssl.privatekey}

# Public Key

${ssl.publickey}
`}
          />
          <Action.CopyToClipboard title="Copy Intermediate Certificate" content={ssl.intermediatecertificate} />
          <Action.CopyToClipboard title="Copy Certificate Chain" content={ssl.certificatechain} />
          <Action.CopyToClipboard title="Copy Private Key" content={ssl.privatekey} />
          <Action.CopyToClipboard title="Copy Public Key" content={ssl.publickey} />
        </ActionPanel>
      }
      markdown={`
# Intermediate Certificate

${ssl.intermediatecertificate}

# Certificate Chain

${ssl.certificatechain}

# Private Key

${ssl.privatekey}

# Public Key

${ssl.publickey}
`}
    />
  );
}
