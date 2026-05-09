import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { AppSummary, getApp, updateApp } from "../lib/api";

export function EditMetadataForm({
  app,
  onSaved,
}: {
  app: AppSummary;
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();
  const { data: detail, isLoading } = useCachedPromise(getApp, [app.bundleID]);

  const userOverrides = detail?.user ?? {};
  const community = detail?.community ?? {};

  const initialDescription = userOverrides.description ?? "";
  const initialDeveloper = userOverrides.developer ?? "";
  const initialCategories = (userOverrides.categories ?? []).join(", ");
  const initialNotes = userOverrides.notes ?? "";
  const initialWebsite = userOverrides.websiteURL ?? "";
  const initialFavorite = !!detail?.isFavorite;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit ${app.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (values: {
              description: string;
              developer: string;
              categories: string;
              notes: string;
              websiteURL: string;
              isFavorite: boolean;
            }) => {
              const body = {
                description: values.description,
                developer: values.developer,
                categories: values.categories
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                notes: values.notes,
                websiteURL: values.websiteURL,
                isFavorite: values.isFavorite,
              };
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Saving…",
              });
              try {
                await updateApp(app.bundleID, body);
                toast.style = Toast.Style.Success;
                toast.title = "Saved";
                onSaved?.();
                pop();
              } catch (e) {
                toast.style = Toast.Style.Failure;
                toast.title = "Save failed";
                toast.message = e instanceof Error ? e.message : String(e);
                await showFailureToast(e, { title: "Save failed" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={app.name} text={app.bundleID} />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder={community.description ?? "What does this app do?"}
        defaultValue={initialDescription}
        info="Empty clears your override and falls back to community/system data."
      />
      <Form.TextField
        id="developer"
        title="Developer"
        placeholder={community.developer ?? "Developer name"}
        defaultValue={initialDeveloper}
      />
      <Form.TextField
        id="categories"
        title="Categories"
        placeholder={
          (community.categories ?? []).join(", ") || "Comma-separated"
        }
        defaultValue={initialCategories}
        info="Comma-separated list."
      />
      <Form.TextField
        id="websiteURL"
        title="Website"
        placeholder={community.websiteURL ?? "https://…"}
        defaultValue={initialWebsite}
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Personal notes"
        defaultValue={initialNotes}
      />
      <Form.Checkbox
        id="isFavorite"
        label="Favorite"
        defaultValue={initialFavorite}
      />
    </Form>
  );
}
