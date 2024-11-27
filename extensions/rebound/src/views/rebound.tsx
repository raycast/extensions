import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import axios, { AxiosError, AxiosResponse } from "axios";
import React, { useState } from "react";
import { ListItemDetailSection } from "../components/detailSection";
import { HeadersListItemDetails } from "../components/headersDetails";
import { HttpStatusListItemDetails } from "../components/httpStatusDetails";
import { RequestListItemDetails } from "../components/requestDetails";
import { useDelegateState } from "../hooks/controllable";
import { Rebound, Rebounds } from "../types/rebound";
import { useReboundHelpers } from "../utils/rebound";
import { getStatusColor } from "../utils/response";
import { EditRebound } from "./editRebound";
import { ResponseView } from "./response";

export type ReboundViewProps = {
  reboundId: Rebound["id"];
  rebounds: Rebounds;
  setRebounds: React.Dispatch<React.SetStateAction<Rebounds>>;
};

export function ReboundView(props: Readonly<ReboundViewProps>) {
  const { reboundId, rebounds, setRebounds } = props;

  const [internalRebounds, setInternalRebounds] = useDelegateState({ value: rebounds, onChange: setRebounds });
  const { rebound, addResponse } = useReboundHelpers({
    reboundId,
    rebounds: internalRebounds,
    setRebounds: setInternalRebounds,
  });

  const [isSending, setIsSending] = useState(false);

  if (!rebound) {
    return null;
  }

  function addAxiosResponse(response: AxiosResponse) {
    addResponse({
      status: {
        code: response.status,
        message: response.statusText,
      },
      body: typeof response.data === "string" ? response.data : JSON.stringify(response.data),
      headers: Object.fromEntries(Object.entries(response.headers)),
      created: new Date(),
    });
  }

  const responses = rebound.responses.toSorted((a, b) => b.created.getTime() - a.created.getTime());

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

        axios(rebound.url.toString(), {
          method: rebound.details.method,
          headers: rebound.details.headers,
        })
          .then((axiosResponse) => {
            sendingToast.style = Toast.Style.Success;
            sendingToast.title = `Sent request`;
            addAxiosResponse(axiosResponse);
          })
          .catch((error: AxiosError) => {
            if (!error.response) {
              sendingToast.style = Toast.Style.Failure;
              sendingToast.title = `Failed to send request`;
              sendingToast.message = error.message;

              return;
            }

            sendingToast.style = Toast.Style.Success;
            sendingToast.title = `Sent request with error`;
            addAxiosResponse(error.response);
          })
          .finally(() => {
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
            title="Edit Rebound"
            icon={Icon.Pencil}
            target={<EditRebound rebounds={rebounds} setRebounds={setRebounds} rebound={rebound} />}
          />
        </ActionPanel>
      }
    >
      {isSending && <List.Item title="Sending..." icon={Icon.Upload} />}
      {responses
        .toSorted((a, b) => b.created.getTime() - a.created.getTime())
        .map((response) => (
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
                      <RequestListItemDetails rebound={rebound} />
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
                  target={<ResponseView rebound={rebound} response={response} />}
                />
                <Action.Push
                  title="Edit Rebound"
                  icon={Icon.Pencil}
                  target={<EditRebound rebounds={rebounds} setRebounds={setRebounds} rebound={rebound} />}
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

                      const newResponses = responses.filter(
                        (reboundResponse) => reboundResponse.created !== response.created,
                      );
                      setInternalRebounds((previousInternalRebounds) => {
                        const updatedRebounds = { ...previousInternalRebounds };

                        updatedRebounds[rebound.id] = {
                          ...rebound,
                          responses: newResponses,
                        };

                        return updatedRebounds;
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
