import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { Icon, List } from "@raycast/api";
import { missingScopes } from "../api/operations";
import { useSchema } from "../hooks/useSchema";
import { useSelf } from "../hooks/useSelf";
import Records from "../records";
import { guard } from "./Guard";
import RecordScreen from "./RecordScreen";

type StandardObjectSlug = "people" | "companies" | "deals";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function StandardObjectCommand({ slug, recordId }: { slug: StandardObjectSlug; recordId?: string }) {
  // Same scope guard as objects.tsx — missing object_configuration:read shows the lock screen.
  const self = useSelf();
  const schema = useSchema();

  const g = guard({
    selfIsActive: self.isActive,
    selfIsLoading: self.isLoading,
    selfError: self.error,
    missing: missingScopes(self.granted, "listObjects"),
    // A failed schema load must read as a failure with a retry path — without
    // this, an empty object list mislabels the workspace as "isn't enabled".
    error: schema.error,
    hasLiveData: schema.objects.length > 0,
    onRetry: () => {
      self.revalidate();
      schema.revalidate();
    },
    errorDetail: (self.error ?? schema.error) ? getErrorMessage(self.error ?? schema.error) : undefined,
  });
  if (g) return g;

  if (schema.isLoading) return <List isLoading />;

  const object = schema.objects.find((o) => o.api_slug === slug);
  if (!object) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Box}
          title={`${capitalize(slug)} isn't enabled in this workspace`}
          description="An admin can enable it in Attio's settings."
        />
      </List>
    );
  }

  if (typeof recordId === "string") {
    return <RecordScreen objectSlug={slug} recordId={recordId} />;
  }

  return <Records object={object} />;
}
