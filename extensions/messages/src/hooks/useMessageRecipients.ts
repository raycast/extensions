import { useMemo } from "react";

import { buildRecipientSections, type RecipientSections } from "../recipient-catalog";
import { useChatCache } from "./useChatCache";

export function useMessageRecipients() {
  const cache = useChatCache("send-message", "");
  const contacts = useMemo(() => {
    const contactsById = new Map([...cache.contactMap.values()].map((contact) => [contact.id, contact]));
    return cache.contactCatalog.map((contact) => contactsById.get(contact.id) ?? contact);
  }, [cache.contactCatalog, cache.contactMap]);
  const recipients = useMemo<RecipientSections | undefined>(
    () =>
      cache.hydratedCatalog
        ? buildRecipientSections(cache.hydratedCatalog, contacts, cache.loadContactPhotos)
        : undefined,
    [cache.hydratedCatalog, cache.loadContactPhotos, contacts],
  );

  return {
    recents: recipients?.recents,
    contacts: recipients?.contacts,
    isLoadingRecipients:
      !cache.hydratedCatalog || (!cache.hasContactCatalogSnapshot && cache.isRefreshingContactCatalog),
    isRecipientCatalogSettled: cache.hasResolvedFreshChats && !cache.isRefreshingContactCatalog,
    permissionView: cache.permissionView,
    hardReload: cache.hardReload,
  };
}
