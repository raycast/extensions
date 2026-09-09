import { useCachedPromise } from "@raycast/utils";
import { listMembers } from "../api/endpoints";
import { missingScopes } from "../api/operations";
import { cacheNs, useSelf } from "./useSelf";

/** Actor-id → display name. Silently empty without user_management:read (formatter falls back to shortId). */
export function useMembers() {
  const self = useSelf();
  const ready = self.isActive === true && missingScopes(self.granted, "listMembers").length === 0;
  const { data } = useCachedPromise(
    async (_fp: string) => {
      const { data } = await listMembers();
      return Object.fromEntries(
        data.map((m) => [
          m.id.workspace_member_id,
          { name: `${m.first_name} ${m.last_name}`.trim(), avatar: m.avatar_url ?? undefined },
        ]),
      );
    },
    [cacheNs],
    { execute: ready },
  );
  return {
    nameFor: (actorId: string) => data?.[actorId]?.name,
    avatarFor: (actorId: string) => data?.[actorId]?.avatar,
  };
}
