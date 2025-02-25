import { showToast, Toast, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { changeCase, getAuthHeaders, stripHTMLTags } from "../lib/utils";
import { UpdatesByGroupType } from "../lib/types/update.types";
import generateUpdateMarkdown from "../lib/markdown/generateUpdateMarkdown";

export default function UpdateGroup({
  username,
  appName,
  group,
}: {
  username: string;
  appName: string;
  group: string;
}) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);

  const url = `https://expo.dev/accounts/${username}/projects/${appName}/updates/${group}`;

  console.log({ url });

  const { isLoading, data: update } = useFetch(url, {
    method: "get",
    headers: headers || {},
    execute: headers === null ? false : true,
    parseResponse: async (resp) => {
      const html = await resp.text();

      const scriptReg = /<script.*>(.*)<\/script>/gm;

      const res = html.match(scriptReg);

      if (!res || !res[1]) return null;

      const data = stripHTMLTags(res[1] as string) as string;

      const jsonData = JSON.parse(data);

      const updateData = jsonData.props.pageProps.updateGroupData as UpdatesByGroupType;

      console.log(jsonData.props.pageProps);

      return updateData;
    },
    onError: (error) => {
      console.log(error);
      showToast({
        title: "Error fetching update group",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: null,
  });

  useEffect(() => {
    async function fetchHeaders() {
      const authHeaders = await getAuthHeaders();
      setHeaders(authHeaders);
    }
    fetchHeaders();
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Update Group Details" isShowingDetail>
      {update &&
        update.updatesByGroup.map((group) => (
          <List.Item
            title={group.updatePlatform === "ios" ? "iOS" : changeCase(group.updatePlatform, "sentence")}
            subtitle={group.id}
            detail={
              <List.Item.Detail
                markdown={generateUpdateMarkdown(group)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Installs"
                      text={group.insights.cumulativeMetrics.metricsAtLastTimestamp.totalInstalls.toString()}
                    />

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="Failed Installs"
                      text={group.insights.cumulativeMetrics.metricsAtLastTimestamp.totalFailedInstalls.toString()}
                    />

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="Deployment Runtime"
                      text={group.deployments?.data?.edges?.[0]?.node?.runtime.version || "N/A"}
                    />

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="Deployment Version"
                      text={group.deployments?.data?.edges?.[0]?.node?.appBuildVersion || "N/A"}
                    />

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="Deployment Channel"
                      text={group.deployments?.data?.edges?.[0]?.node?.channel?.name || "N/A"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
    </List>
  );
}
