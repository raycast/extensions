import { Action, ActionPanel, Detail, Toast, showToast, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { retrieveSSLBundle } from "./utils/api";
import { RetrieveSSLBundleResponse } from "./utils/types";
import { API_DOCS_URL } from "./utils/constants";

export default function RetrieveBundle(props: LaunchProps<{ arguments: Arguments.RetrieveSslBundle }>) {
  const { domain } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [ssl, setSSL] = useState<RetrieveSSLBundleResponse>();

  async function callApi() {
    setIsLoading(true);
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
  }

  useEffect(() => {
    callApi();
  }, [])
  
  const markdown = !ssl ? `# ${domain}` : `# ${domain} | ${ssl.status}
---
## Intermediate Certificate

${ssl.intermediatecertificate}

## Certificate Chain

${ssl.certificatechain}

## Private Key

${ssl.privatekey}

## Public Key

${ssl.publickey}`;

  return (
    <Detail isLoading={isLoading}
      actions={
        <ActionPanel>
          {ssl && <>
            <Action.CopyToClipboard
              title="Copy Entire SSL Bundle"
              content={markdown}
            />
            <Action.CopyToClipboard title="Copy Intermediate Certificate" content={ssl.intermediatecertificate} />
            <Action.CopyToClipboard title="Copy Certificate Chain" content={ssl.certificatechain} />
            <Action.CopyToClipboard title="Copy Private Key" content={ssl.privatekey} />
            <Action.CopyToClipboard title="Copy Public Key" content={ssl.publickey} />
          </>}
          <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Go to API Reference"
            url={`${API_DOCS_URL}SSL%20Retrieve%20Bundle%20by%20Domain`}
          />
          </ActionPanel.Section>
        </ActionPanel>
      }
      markdown={markdown}
    />
  );
}
