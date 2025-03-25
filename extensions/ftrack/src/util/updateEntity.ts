// :copyright: Copyright (c) 2023 ftrack
import { Session } from "@ftrack/api";

export async function updateEntity({
  session,
  entityType,
  entityId,
  values,
}: {
  session: Session;
  entityType: string;
  entityId: string;
  values: object;
}) {
  console.debug("Updating", entityType, entityId, values);
  const response = await session.update(entityType, [entityId], values, {
    decodeDatesAsIso: true,
  });
  console.debug("Update", response);
  return response;
}
