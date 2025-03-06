// :copyright: Copyright (c) 2023 ftrack
import { ActionPanel, Action, Icon, showToast, Toast, useNavigation, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { buildExpression } from "./util/buildExpression";
import { operation, QueryResponse } from "@ftrack/api";
import { updateEntity } from "./util/updateEntity";
import { Status } from "./types";
import { session } from "./util/session";

async function getStatusOptions({ entityType, entityId }: { entityType: string; entityId: string }) {
  const statusQuery = buildExpression({
    entityType: "Status",
    projection: ["id", "name", "sort", "color"],
    order: "sort desc, name asc",
    limit: 200,
  });
  const entityQuery = buildExpression({
    entityType: entityType,
    projection: ["status_id", "__permissions.status_id"],
    filter: [`id is "${entityId}"`],
    limit: 1,
  });

  const [statusResponse, entityResponse] = await session.call<[QueryResponse<Status>, QueryResponse]>(
    [operation.query(statusQuery), operation.query(entityQuery)],
    {
      decodeDatesAsIso: true,
    }
  );

  const allowedStatusIds = entityResponse.data[0].__permissions.status_id.__options;
  const validStatuses = statusResponse.data.filter((status) => allowedStatusIds.includes(status.id));
  const defaultValue = entityResponse.data[0].status_id as string;

  return {
    options: validStatuses,
    defaultValue,
  };
}

export default function ChangeStatusCommand({
  entityType = "TypedContext",
  entityId,
  onStatusChanged = () => ({}),
}: {
  entityType: string;
  entityId: string;
  onStatusChanged?: () => void;
}) {
  const { data, isLoading, mutate } = usePromise(getStatusOptions, [{ entityType, entityId }]);
  const { pop } = useNavigation();

  const mutateEntity = async (values: { status_id: string }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Changing status...",
    });
    try {
      await mutate(updateEntity({ session, entityType, entityId, values }));
      toast.style = Toast.Style.Success;
      toast.title = "Status changed";
      onStatusChanged?.();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to change status";
      toast.message = (error as Error)?.message;
    }
  };

  return (
    <List isLoading={isLoading}>
      {data?.options.map((status) => (
        <List.Item
          key={status.id}
          title={status.name}
          icon={{
            source: status.id === data.defaultValue ? Icon.CheckCircle : Icon.Circle,
            tintColor: status.color,
          }}
          actions={
            <ActionPanel>
              <Action
                title="Change Status"
                onAction={() => {
                  mutateEntity({ status_id: status.id });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
