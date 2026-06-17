import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { attio, parseErrorMessage } from "./attio";
import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import Records from "./records";
import Attributes from "./attributes";
import { PostV2ObjectsData } from "attio-js/dist/commonjs/models/operations/postv2objects";
import OpenInAttio from "./open-in-attio";
import { ObjectT } from "attio-js/dist/commonjs/models/components/object";

export const getObjectTitle = (object: ObjectT) =>
  object.pluralNoun || object.singularNoun || object.apiSlug || object.id.objectId;
const STANDARD_OBJECT_ICONS: Record<string, Image.ImageLike> = {
  companies: { source: Icon.Building, tintColor: Color.Orange },
  deals: Icon.BankNote,
  people: { source: Icon.Person, tintColor: Color.Blue },
  users: { source: Icon.Person, tintColor: Color.Green },
  workspaces: Icon.AppWindowGrid2x2,
};
const isStandardObject = (object: ObjectT) => !!STANDARD_OBJECT_ICONS[object.apiSlug || ""];
export default function Objects() {
  const {
    isLoading,
    data: objects,
    mutate,
  } = useCachedPromise(
    async () => {
      const { data } = await attio.objects.list();
      return data;
    },
    [],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading}>
      {objects.map((object) => (
        <List.Item
          key={object.id.objectId}
          icon={STANDARD_OBJECT_ICONS[object.apiSlug || ""] || Icon.Box}
          title={object.pluralNoun || ""}
          accessories={[
            {
              tag: isStandardObject(object) ? "Standard" : { value: "Custom", color: Color.Blue },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Document} title="Records" target={<Records object={object} />} />
              <Action.Push icon={Icon.AppWindowGrid2x2} title="Attributes" target={<Attributes object={object} />} />
              {object.apiSlug && (
                <OpenInAttio route={isStandardObject(object) ? object.apiSlug : `custom/${object.apiSlug}`} />
              )}
              <Action.Push
                icon={Icon.Plus}
                title="New Custom Object"
                target={<NewCustomObject />}
                onPop={mutate}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function NewCustomObject() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<PostV2ObjectsData>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.singularNoun);
      try {
        await attio.objects.create({
          data: values,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = parseErrorMessage(error);
      }
    },
    validation: {
      pluralNoun: FormValidation.Required,
      singularNoun: FormValidation.Required,
      apiSlug: FormValidation.Required,
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
      <Form.TextField title="Plural Noun" placeholder="e.g. Products" {...itemProps.pluralNoun} />
      <Form.TextField title="Singular Noun" placeholder="e.g. Product" {...itemProps.singularNoun} />
      <Form.TextField
        title="Identifier / Slug"
        placeholder="e.g. product"
        info="Slugs are used to identify your object in the URL and are formatted to only include lowercase letters, numbers, and underscores"
        {...itemProps.apiSlug}
      />
      <Form.Description text="Important: Once an object is created the slug cannot be changed." />
    </Form>
  );
}
