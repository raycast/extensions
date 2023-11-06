import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getNameServersByDomain } from "../utils/api";
import { GetNameServersResponse } from "../utils/types";
import { API_DOCS_URL } from "../utils/constants";
import UpdateNameServersComponent from "./UpdateNameServersComponent";

type GetNameServersComponentProps = {
    domain: string;
}
export default function GetNameServersComponent({ domain }: GetNameServersComponentProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [ns, setNS] = useState<string[]>();

    async function getFromApi() {
        setIsLoading(true);
        const response = (await getNameServersByDomain(domain)) as GetNameServersResponse;
        if (response.status === "SUCCESS") {
            setNS(response.ns);
            showToast({
              style: Toast.Style.Success,
              title: "SUCCESS",
              message: `Fetched ${response.ns.length} Name Servers`,
            });
          }
        setIsLoading(false);
    }

    useEffect(() => {
        getFromApi();
    }, [])
    return <Detail navigationTitle="Get Name Servers" isLoading={isLoading} markdown={`# ${domain}
    
---

${!ns ? "" : ns.join(`\n\n`)}`} actions={<ActionPanel>
    {ns && <Action.CopyToClipboard content={ns.join()} />}
    <Action.Push title="Update Name Servers" icon={Icon.Pencil} target={<UpdateNameServersComponent domain={domain} initialNS={ns} onNameServersUpdated={getFromApi} />} />
    <Action.OpenInBrowser
            title="Go to API Reference"
            url={`${API_DOCS_URL}Domain%20Get%20Name%20Servers`}
          />
</ActionPanel>} />
}