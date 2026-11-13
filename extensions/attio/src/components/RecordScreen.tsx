import { ActionPanel, List, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { deleteRecord, getRecord } from "../api/endpoints";
import type { AttioRecord } from "../api/types";
import { useAttio } from "../hooks/useAttio";
import { useMembers } from "../hooks/useMembers";
import { usePins } from "../hooks/usePins";
import { useRecordTitles } from "../hooks/useRecordTitles";
import { useSchema } from "../hooks/useSchema";
import { recordSubtitle, recordTitle } from "../lib/display";
import { getRecordReferences } from "../lib/format";
import { recordIcon } from "../lib/record-icon";
import { guard } from "./Guard";
import RecordActions from "./RecordActions";
import RecordDetail from "./RecordDetail";

/**
 * Single-record deep link (spec round-4c §2/§3, unified round-9): pushed from
 * another record's "Open Company" / "View Related People" action, or reached
 * from search's "Show Record", so a linked record's own full action panel
 * (relations, Edit, Delete, copies) is reachable without a full list search.
 */
export default function RecordScreen({ objectSlug, recordId }: { objectSlug: string; recordId: string }) {
  const schema = useSchema();
  const members = useMembers();
  const pins = usePins(objectSlug);
  const { push } = useNavigation();
  const h = useAttio("getRecord", async (slug: string, id: string) => (await getRecord(slug, id)).data, [
    objectSlug,
    recordId,
  ]);
  const { isLoading, data, revalidate } = h;
  const record: AttioRecord | undefined = data;

  const refs = record ? getRecordReferences(record.values) : [];
  const { titleFor } = useRecordTitles(refs);

  const g = guard(h.guardInput(!!record));
  if (g) return g;

  const attributes = schema.attributesFor(objectSlug);
  const singularNoun = schema.objects.find((o) => o.api_slug === objectSlug)?.singular_noun ?? "Record";

  const handleDelete = async () => {
    await deleteRecord(objectSlug, recordId);
    await showToast({ style: Toast.Style.Success, title: "Deleted" });
    await popToRoot();
  };

  return (
    <List isLoading={isLoading || schema.isLoading} isShowingDetail={!!record}>
      {record && (
        <List.Item
          icon={recordIcon(record, objectSlug)}
          title={recordTitle(record, objectSlug)}
          subtitle={recordSubtitle(record, objectSlug)}
          detail={
            <RecordDetail record={record} attributes={attributes} titleFor={titleFor} memberName={members.nameFor} />
          }
          actions={
            <ActionPanel>
              <RecordActions
                record={record}
                objectSlug={objectSlug}
                singularNoun={singularNoun}
                attributes={attributes}
                titleFor={titleFor}
                onMutated={revalidate}
                onDelete={handleDelete}
                pins={{ pinned: pins.pinned.has(record.id.record_id), toggle: () => pins.toggle(record.id.record_id) }}
                pushFallback={(slug, id) => push(<RecordScreen objectSlug={slug} recordId={id} />)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
