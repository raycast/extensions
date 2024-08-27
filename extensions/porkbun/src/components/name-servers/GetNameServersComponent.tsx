import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useGetNameServersByDomain } from "../../utils/api";
import { API_DOCS_URL } from "../../utils/constants";
import UpdateNameServersComponent from "./UpdateNameServersComponent";
import ErrorComponent from "../ErrorComponent";

type GetNameServersComponentProps = {
  domain: string;
};
export default function GetNameServersComponent({ domain }: GetNameServersComponentProps) {
  const { isLoading, data, error, revalidate } = useGetNameServersByDomain(domain);

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <Detail
      navigationTitle="Get Name Servers"
      isLoading={isLoading}
      markdown={`# ${domain}
    
---

${!data ? "" : data.ns.join(`\n\n`)}`}
      actions={
        <ActionPanel>
          {data && <Action.CopyToClipboard content={data.ns.join()} />}
          <Action.Push
            title="Update Name Servers"
            icon={Icon.Pencil}
            target={
              <UpdateNameServersComponent domain={domain} initialNS={data?.ns} onNameServersUpdated={revalidate} />
            }
          />
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Go to API Reference" url={`${API_DOCS_URL}Domain%20Get%20Name%20Servers`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
