import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import { useRetrieveSSLBundle } from "./utils/api";
import { API_DOCS_URL } from "./utils/constants";
import ErrorComponent from "./components/ErrorComponent";

export default function RetrieveBundle(props: LaunchProps<{ arguments: Arguments.RetrieveSslBundle }>) {
  const { domain } = props.arguments;

  const { isLoading, data: ssl, error } = useRetrieveSSLBundle(domain);

  const markdown = !ssl
    ? `# ${domain}`
    : `# ${domain} | ${ssl.status}
---
## Intermediate Certificate

${ssl.intermediatecertificate}

## Certificate Chain

${ssl.certificatechain}

## Private Key

${ssl.privatekey}

## Public Key

${ssl.publickey}`;

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <Detail
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {ssl && (
            <>
              <Action.CopyToClipboard title="Copy Entire SSL Bundle" content={markdown} />
              <Action.CopyToClipboard title="Copy Intermediate Certificate" content={ssl.intermediatecertificate} />
              <Action.CopyToClipboard title="Copy Certificate Chain" content={ssl.certificatechain} />
              <Action.CopyToClipboard title="Copy Private Key" content={ssl.privatekey} />
              <Action.CopyToClipboard title="Copy Public Key" content={ssl.publickey} />
            </>
          )}
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
