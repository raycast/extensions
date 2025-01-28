import { Action, ActionPanel, Alert, confirmAlert, Icon, List } from "@raycast/api";
import { UseStorage } from "../hooks/storage";
import { Request, Requests } from "../types/request";
import { RequestHelpers } from "../utils/request";
import { isJson } from "../utils/storage";
import { CreateRequest } from "../views/CreateRequest";
import { EditRequest } from "../views/EditRequest";
import { RequestView } from "../views/Request";
import { ListItemDetailSection } from "./DetailSection";
import { HeadersListItemDetails } from "./HeadersDetails";

export type ListItemRequestProps = {
  request: Request;
  requests: UseStorage<Requests>["value"];
  setRequests: UseStorage<Requests>["setValue"];
  clearRequests: UseStorage<Requests>["removeValue"];
  refetchRequests: UseStorage<Requests>["refetch"];
  helpers: RequestHelpers;
};

export function ListItemRequest(props: Readonly<ListItemRequestProps>) {
  const { request, requests, setRequests, clearRequests, refetchRequests, helpers } = props;
  const { favoriteRequest, unfavoriteRequest, tocURL } = helpers;

  let actualBody: string | undefined;
  if (request.details.body && request.details.body !== "") {
    if (isJson(request.details.body)) {
      actualBody = `\`\`\`json\n${JSON.stringify(JSON.parse(request.details.body), null, 2)}\n\`\`\``;
    } else {
      actualBody = `\`\`\`\n${request.details.body}\n\`\`\``;
    }
  }

  const details = (
    <List.Item.Detail
      markdown={actualBody}
      metadata={
        <List.Item.Detail.Metadata>
          <ListItemDetailSection noSeparator>
            <List.Item.Detail.Metadata.TagList title="Method">
              <List.Item.Detail.Metadata.TagList.Item icon={Icon.Hashtag} text={request.details.method} />
            </List.Item.Detail.Metadata.TagList>
          </ListItemDetailSection>
          <ListItemDetailSection title="Headers">
            <HeadersListItemDetails headers={request.details.headers ?? {}} />
          </ListItemDetailSection>
        </List.Item.Detail.Metadata>
      }
    />
  );

  return (
    <List.Item
      key={request.id}
      title={request.url.toString()}
      detail={details}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Request"
            icon={Icon.Ellipsis}
            target={<RequestView requestId={request.id} requests={requests} setRequests={setRequests} />}
          />
          <Action.Push
            title="Create New Request"
            icon={Icon.Plus}
            target={<CreateRequest requests={requests} setRequests={setRequests} />}
            onPop={refetchRequests}
          />
          <Action.Push
            title="Edit Request"
            icon={Icon.Pencil}
            target={<EditRequest requests={requests} setRequests={setRequests} request={request} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title={`${request.favorite ? "Unfavorite" : "Favorite"} Request`}
            icon={request.favorite ? Icon.StarDisabled : Icon.Star}
            onAction={request.favorite ? unfavoriteRequest : favoriteRequest}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          {/* eslint-disable-next-line @raycast/prefer-title-case */}
          <Action.CopyToClipboard title="Copy cURL" content={tocURL()} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <ActionPanel.Section title="Danger Zone">
            <Action
              title="Delete Request"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                if (
                  !(await confirmAlert({
                    title: "Are you sure?",
                    message: "Do you really want to delete this request? This action is irreversible.",
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  }))
                ) {
                  return;
                }

                setRequests((previous) => {
                  const updatedRequests = { ...previous };
                  delete updatedRequests[request.id];

                  return updatedRequests;
                });
              }}
            />
            <Action
              title="Delete All Requests"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
              onAction={async () => {
                if (
                  !(await confirmAlert({
                    title: "Are you sure?",
                    message: "Do you really want to delete all requests? This action is irreversible.",
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  }))
                ) {
                  return;
                }

                clearRequests().then();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
