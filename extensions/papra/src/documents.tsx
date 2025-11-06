import { Icon, List } from "@raycast/api";
import { Document, Organization } from "./types";
import { useCachedPromise } from "@raycast/utils";
import { papra, PAPRA_COLOR } from "./papra";

const DOCUMENT_ICONS: Record<Document["mimeType"], Icon> = {
    "image/svg+xml": Icon.Image
}

export default function Documents({ organization }: { organization: Organization }) {
  const { isLoading, data: documents } = useCachedPromise(
    async (organizationId) => {
      const res = await papra.documents.list({ organizationId });
      return res.documents;
    },
    [organization.id],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Organizations / ${organization.name} / Documents`}>
      {!isLoading && !documents.length ? <List.EmptyView icon={Icon.Cloud} title="No documents" description="There are no documents in this organization yet. Start by uploading some documents." /> : documents.map((document) => (
        <List.Item key={document.id} icon={{source: DOCUMENT_ICONS[document.mimeType] || Icon.QuestionMark, tintColor: PAPRA_COLOR}} title={document.name} accessories={[{date: new Date(document.createdAt)}]} />
      ))}
    </List>
  );
}
