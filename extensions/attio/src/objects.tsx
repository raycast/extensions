import { failToast } from "@chrismessina/raycast-kit";
import { Action, ActionPanel, Color, Form, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createObject, listObjects } from "./api/endpoints";
import { satisfied } from "./api/operations";
import type { AttioObject } from "./api/types";
import Attributes from "./attributes";
import { guard } from "./components/Guard";
import { useAttio } from "./hooks/useAttio";
import { getObjectTitle } from "./lib/display";
import { isStandardObject, STANDARD_OBJECT_ICONS } from "./lib/record-icon";
import OpenInAttio from "./open-in-attio";
import Records from "./records";

export default function Objects() {
  const h = useAttio("listObjects", async () => (await listObjects()).data, []);
  const { isLoading, data: objects = [], revalidate, self } = h;
  const canCreate = satisfied(self.granted, "object_configuration:read-write");

  const g = guard(h.guardInput(objects.length > 0));
  if (g) return g;

  const newObjectAction = canCreate ? (
    <Action.Push
      icon={Icon.Plus}
      title="New Custom Object"
      target={<NewCustomObject onCreated={revalidate} />}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  ) : null;

  return (
    <List isLoading={isLoading || self.isLoading} actions={<ActionPanel>{newObjectAction}</ActionPanel>}>
      {objects.map((object: AttioObject) => (
        <List.Item
          key={object.id.object_id}
          icon={STANDARD_OBJECT_ICONS[object.api_slug || ""] ?? Icon.Box}
          title={getObjectTitle(object)}
          accessories={[{ tag: isStandardObject(object) ? "Standard" : { value: "Custom", color: Color.Blue } }]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Document} title="Records" target={<Records object={object} />} />
              <Action.Push icon={Icon.AppWindowGrid2x2} title="Attributes" target={<Attributes object={object} />} />
              <OpenInAttio
                route={isStandardObject(object) ? object.api_slug || "" : `custom/${object.api_slug || ""}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function NewCustomObject({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();
  type Values = { plural_noun: string; singular_noun: string; api_slug: string };
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.singular_noun);
      try {
        await createObject({ data: values });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        onCreated();
        pop();
      } catch (error) {
        failToast(toast, error, { title: "Failed" });
      }
    },
    validation: {
      plural_noun: FormValidation.Required,
      singular_noun: FormValidation.Required,
      api_slug: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Object" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Plural Noun" placeholder="e.g. Products" {...itemProps.plural_noun} />
      <Form.TextField title="Singular Noun" placeholder="e.g. Product" {...itemProps.singular_noun} />
      <Form.TextField
        title="Identifier / Slug"
        placeholder="e.g. product"
        info="Lowercase letters, numbers, and underscores. Cannot be changed after creation."
        {...itemProps.api_slug}
      />
    </Form>
  );
}
