import { Action, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useClients } from "../../api/hooks.js";
import { api } from "../../api/index.js";
import { tagArchived } from "../../utils/list.js";
import { useOrgId } from "../../utils/membership.js";
import { messageBuilder, tryWithToast } from "../../utils/operations.js";
import { CrudActions } from "../shared/CrudActions.js";
import { Entry } from "../shared/Entry.js";
import MembershipAccessory from "../shared/MembershipAccessory.js";
import { ClientDetails } from "./ClientDetails.js";
import { ClientForm } from "./ClientForm.js";

export function ClientCommand() {
  const navigation = useNavigation();
  const orgId = useOrgId();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const clients = useClients(orgId);

  const sorted = clients.data?.toSorted((a, b) => Number(a.is_archived) - Number(b.is_archived));

  return (
    <List
      navigationTitle="Search Clients"
      isLoading={clients.isLoading}
      searchBarAccessory={<MembershipAccessory />}
      isShowingDetail={isShowingDetail}
    >
      {orgId && !sorted?.length && !clients.error && (
        <List.EmptyView
          icon={Icon.Person}
          title="No clients found"
          description="Create your first client now!"
          actions={
            <CrudActions
              name="Client"
              onNew={() =>
                navigation.push(
                  <Entry>
                    <ClientForm
                      onSubmit={async (values) => {
                        await tryWithToast(
                          () => api.createClient(values, { params: { organization: orgId } }),
                          messageBuilder("create", "client", values.name),
                        );
                        clients.refetch();
                        navigation.pop();
                      }}
                    />
                  </Entry>,
                )
              }
            />
          }
        />
      )}
      {orgId &&
        sorted?.map((client) => (
          <List.Item
            key={client.id}
            title={client.name}
            accessories={[tagArchived(client.is_archived)]}
            detail={<ClientDetails client={client} />}
            actions={
              <CrudActions
                name="Client"
                onDetails={() => setIsShowingDetail(true)}
                onDelete={async () => {
                  await tryWithToast(
                    () => api.deleteClient(undefined, { params: { organization: orgId, client: client.id } }),
                    messageBuilder("delete", "client", client.name),
                  );
                  clients.refetch();
                }}
                onEdit={() =>
                  navigation.push(
                    <Entry>
                      <ClientForm
                        initialValues={client}
                        onSubmit={async (values) => {
                          await tryWithToast(
                            () => api.updateClient(values, { params: { organization: orgId, client: client.id } }),
                            messageBuilder("update", "client", values.name),
                          );
                          clients.refetch();
                          navigation.pop();
                        }}
                      />
                    </Entry>,
                  )
                }
                onNew={() =>
                  navigation.push(
                    <Entry>
                      <ClientForm
                        onSubmit={async (values) => {
                          await tryWithToast(
                            () => api.createClient(values, { params: { organization: orgId } }),
                            messageBuilder("create", "client", values.name),
                          );
                          clients.refetch();
                          navigation.pop();
                        }}
                      />
                    </Entry>,
                  )
                }
                itemActions={
                  <Action
                    title={client.is_archived ? "Unarchive" : "Archive"}
                    icon={Icon.Folder}
                    shortcut={{ modifiers: ["ctrl"], key: "a" }}
                    onAction={async () => {
                      await tryWithToast(
                        () =>
                          api.updateClient(
                            { ...client, is_archived: !client.is_archived },
                            { params: { organization: orgId, client: client.id } },
                          ),
                        messageBuilder(client.is_archived ? "unarchive" : "archive", "client", client.name),
                      );
                      clients.refetch();
                    }}
                  />
                }
              />
            }
          />
        ))}
    </List>
  );
}
