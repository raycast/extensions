import { Action, ActionPanel, Alert, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { API_DOCS_URL } from "../../utils/constants";
import { UrlForwarding, ErrorResponse } from "../../utils/types";
import { deleteUrlForwardByDomainAndId, getUrlForwardingByDomain } from "../../utils/api";
import AddURLForwardingComponent from "./AddURLForwardingComponent";
import ErrorComponent from "../ErrorComponent";

type GetURLForwardingComponentProps = {
  domain: string;
};
export default function GetURLForwardingComponent({ domain }: GetURLForwardingComponentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [forwards, setForwards] = useState<UrlForwarding[]>();
  const [error, setError] = useState<ErrorResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getUrlForwardingByDomain(domain);
    if (response.status === "SUCCESS") {
      setForwards(response.forwards);
      showToast({
        style: Toast.Style.Success,
        title: "SUCCESS",
        message: `Fetched ${response.forwards.length} Forwards`,
      });
    } else {
      setError(response);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDeleteUrlForward(id: string) {
    if (
      await confirmAlert({
        title: `Delete URL Forward '${id}'?`,
        message: "You will not be able to recover it.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteUrlForwardByDomainAndId(domain, id);
      if (response.status === "SUCCESS") {
        showToast({
          style: Toast.Style.Success,
          title: "SUCCESS!",
          message: `Deleted URL Forward ${id}`,
        });
        if (forwards) setForwards(forwards.filter((forward) => forward.id !== id));
      }
      setIsLoading(false);
    }
  }

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List navigationTitle="Get URL Forwarding" isLoading={isLoading} isShowingDetail>
      {forwards &&
        forwards.map((forward) => (
          <List.Item
            key={forward.id}
            title={forward.id}
            accessories={[{ tag: forward.type }]}
            actions={
              <ActionPanel>
                <Action
                  title="Delete URL Forward"
                  icon={Icon.DeleteDocument}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDeleteUrlForward(forward.id)}
                />
                <Action.Push
                  title="Add URL Forward"
                  icon={Icon.Plus}
                  target={<AddURLForwardingComponent domain={domain} onUrlForwardingAdded={getFromApi} />}
                />
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Go to API Reference"
                    url={`${API_DOCS_URL}Domain%20Get%20URL%20Forwarding`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="id" text={forward.id} />
                    <List.Item.Detail.Metadata.Label title="subdomain" text={forward.subdomain} />
                    <List.Item.Detail.Metadata.Link
                      title="Location"
                      text={forward.location}
                      target={forward.location}
                    />
                    <List.Item.Detail.Metadata.Label title="type" text={forward.type} />
                    <List.Item.Detail.Metadata.Label
                      title="includePath"
                      icon={forward.includePath === "yes" ? Icon.Check : Icon.Multiply}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="wildcard"
                      icon={forward.wildcard === "yes" ? Icon.Check : Icon.Multiply}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Add URL Forward"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add URL Forward"
                  icon={Icon.Plus}
                  target={<AddURLForwardingComponent domain={domain} onUrlForwardingAdded={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
