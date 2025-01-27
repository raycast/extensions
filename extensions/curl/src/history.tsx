import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useMemo } from "react";
import { useStorage } from "./hooks/storage";
import { Request, Requests } from "./types/request";
import { Response } from "./types/response";
import { StorageKey } from "./types/storage";
import { getRequestsHelpersFactory } from "./utils/request";
import { getStatusColor } from "./utils/response";
import { ResponseView } from "./views/Response";

type HistoryEntry = {
  request: Request;
  response: Response;
};

export default function History() {
  const { value: requests, setValue: setRequests } = useStorage<Requests>({
    key: StorageKey.REQUESTS,
    initialValue: {},
  });

  const helpersFactory = useMemo(
    () =>
      getRequestsHelpersFactory({
        requests,
        setRequests,
      }),
    [requests, setRequests],
  );

  const history = useMemo(
    () =>
      Object.values(requests)
        .reduce(
          (accumulator, request) =>
            accumulator.concat(
              request.responses.map((response) => ({
                request,
                response,
              })),
            ),
          [] as HistoryEntry[],
        )
        .sort((a, b) => b.response.created.getTime() - a.response.created.getTime()),
    [requests],
  );

  return (
    <List>
      {history.map(({ request, response }) => {
        const { tocURL } = helpersFactory(request);

        return (
          <List.Item
            key={`request-${request.id}-response-${response.created.getTime()}`}
            title={request.url.toString()}
            accessories={[
              {
                tag: {
                  value: response.status.code.toString(),
                  color: getStatusColor(response.status.code),
                },
              },
              {
                tag: response.created.toLocaleString(),
                icon: Icon.Calendar,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Response"
                  icon={Icon.Ellipsis}
                  target={<ResponseView request={request} response={response} />}
                />
                <Action.CopyToClipboard
                  title="Copy cURL"
                  content={tocURL()}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
