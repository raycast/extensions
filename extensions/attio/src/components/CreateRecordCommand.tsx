import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { Form, Icon, List, popToRoot } from "@raycast/api";
import { missingScopes } from "../api/operations";
import { useSchema } from "../hooks/useSchema";
import { useSelf } from "../hooks/useSelf";
import { guard } from "./Guard";
import RecordCreateForm from "./RecordCreateForm";

/**
 * Top-level Create command (drafts only work on a command-root form, so these
 * can't be pushed views). Same guard chain as StandardObjectCommand.
 */
export default function CreateRecordCommand({
  slug,
  draftValues,
}: {
  slug: "people" | "companies" | "deals";
  draftValues?: Record<string, unknown>;
}) {
  const self = useSelf();
  const schema = useSchema();

  const g = guard({
    selfIsActive: self.isActive,
    selfIsLoading: self.isLoading,
    selfError: self.error,
    missing: [
      ...new Set([...missingScopes(self.granted, "listObjects"), ...missingScopes(self.granted, "createRecord")]),
    ],
    error: schema.error,
    hasLiveData: schema.objects.length > 0,
    onRetry: () => {
      self.revalidate();
      schema.revalidate();
    },
    errorDetail: (self.error ?? schema.error) ? getErrorMessage(self.error ?? schema.error) : undefined,
  });
  if (g) return g;

  if (schema.isLoading) return <Form isLoading />;

  const object = schema.objects.find((o) => o.api_slug === slug);
  const attributes = schema.attributesFor(slug);
  if (!object || !attributes) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Box}
          title={`${slug.charAt(0).toUpperCase() + slug.slice(1)} isn't enabled in this workspace`}
          description="An admin can enable it in Attio's settings."
        />
      </List>
    );
  }

  return (
    <RecordCreateForm
      objectSlug={slug}
      singularNoun={object.singular_noun ?? "Record"}
      attributes={attributes}
      enableDrafts
      draftValues={draftValues}
      onCreated={() => {}}
      afterCreate={popToRoot}
    />
  );
}
