import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import React, { useState } from "react";
import { ListItemDetailSection } from "../components/DetailSection";
import { HeadersListItemDetails } from "../components/HeadersDetails";
import { HttpStatusListItemDetails } from "../components/HttpStatusDetails";
import { RequestListItemDetails } from "../components/RequestDetails";
import { useDelegateState } from "../hooks/controllable";
import { Request, Requests } from "../types/request";
import { getRequestHelpers } from "../utils/request";
import { getStatusColor } from "../utils/response";
import { EditRequest } from "./EditRequest";
import { ResponseView } from "./Response";

export type RequestViewProps = {
  requestId: Request["id"];
  requests: Requests;
  setRequests: React.Dispatch<React.SetStateAction<Requests>>;
};

export function RequestView(props: Readonly<RequestViewProps>) {
  const { requestId, requests, setRequests } = props;

  const [internalRequests, setInternalRequests] = useDelegateState({ value: requests, onChange: setRequests });
  const { request, sendRequest } = getRequestHelpers({
    requestId,
    requests: internalRequests,
    setRequests: setInternalRequests,
  });

  const [isSending, setIsSending] = useState(false);

  if (!request) {
    return null;
  }

  const sendRequestAction = !isSending && (
    <Action
      title="Send"
      icon={Icon.Upload}
      onAction={async () => {
        setIsSending(true);

        const sendingToast = await showToast({
          style: Toast.Style.Animated,
          title: `Sending request...`,
        });

        sendRequest({
          toast: sendingToast,
        }).finally(() => {
          setIsSending(false);
        });
      }}
      shortcut={{ modifiers: ["cmd"], key: "m" }}
    />
  );

  return (
    <List
      isShowingDetail
      isLoading={isSending}
      actions={
        <ActionPanel>
          {sendRequestAction}
          <Action.Push
            title="Edit Request"
            icon={Icon.Pencil}
            target={<EditRequest requests={requests} setRequests={setRequests} request={request} />}
          />
        </ActionPanel>
      }
    >
      {isSending && <List.Item title="Sending..." icon={Icon.Upload} />}
      {request.responses.map((response) => (
        <List.Item
          key={response.created.toISOString()}
          title={response.created.toLocaleString()}
          accessories={[
            {
              tag: {
                value: response.status.code.toString(),
                color: getStatusColor(response.status.code),
              },
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <ListItemDetailSection noSeparator>
                    <HttpStatusListItemDetails status={response.status} />
                    <RequestListItemDetails request={request} />
                  </ListItemDetailSection>
                  <ListItemDetailSection title="Headers">
                    <HeadersListItemDetails headers={response.headers} />
                  </ListItemDetailSection>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="View Response"
                icon={Icon.Ellipsis}
                target={<ResponseView request={request} response={response} />}
              />
              <Action.Push
                title="Edit Request"
                icon={Icon.Pencil}
                target={<EditRequest requests={requests} setRequests={setRequests} request={request} />}
              />
              {sendRequestAction}
              <ActionPanel.Section title="Danger Zone">
                <Action
                  title="Delete Response"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      !(await confirmAlert({
                        title: "Are you sure?",
                        message: "Do you really want to delete this response?",
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                        },
                      }))
                    ) {
                      return;
                    }

                    const newResponses = request?.responses.filter(
                      (requestResponse) => requestResponse.created !== response.created,
                    );
                    setInternalRequests((previousInternalRequests) => {
                      const updatedRequests = { ...previousInternalRequests };

                      updatedRequests[request.id] = {
                        ...request,
                        responses: newResponses,
                      };

                      return updatedRequests;
                    });
                  }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
