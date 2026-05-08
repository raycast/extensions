import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchType,
  List,
  Toast,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import {
  addPhotoToGroup,
  addPhotoToPhotoset,
  createPhotoset,
  getPublishingContext,
  normalizeTags,
  uploadPhoto,
} from "./flickr";
import { getStoredAuth } from "./storage";
import { UploadFormValues } from "./types";

export default function Command() {
  const authPromise = useCachedPromise(getStoredAuth, []);
  const contextPromise = useCachedPromise(
    async () => {
      const auth = await getStoredAuth();
      if (!auth) {
        return { photosets: [], groups: [] };
      }

      return getPublishingContext(auth);
    },
    [],
  );

  const { handleSubmit, itemProps } = useForm<UploadFormValues>({
    initialValues: {
      image: [],
      title: "",
      description: "",
      tags: "",
      visibility: "private",
      photosetId: "",
      newPhotosetTitle: "",
      groups: [],
    },
    validation: {
      image: (value) => (Array.isArray(value) && value.length > 0 ? undefined : "An image is required"),
      title: FormValidation.Required,
    },
    onSubmit: async (submittedValues) => {
      const auth = await getStoredAuth();
      if (!auth) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Flickr is not connected",
          message: "Run Setup Flickr first.",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Uploading photo to Flickr…",
      });

      try {
        const photoId = await uploadPhoto(auth, {
          filePath: submittedValues.image[0],
          title: submittedValues.title,
          description: submittedValues.description,
          tags: normalizeTags(submittedValues.tags),
          visibility: submittedValues.visibility,
        });

        let photosetId = submittedValues.photosetId;
        let isNewPhotoset = false;
        if (submittedValues.newPhotosetTitle.trim()) {
          photosetId = await createPhotoset(auth, submittedValues.newPhotosetTitle.trim(), photoId);
          isNewPhotoset = true;
        }

        // Only add to photoset if it's an existing one (createPhotoset already adds the photo)
        if (photosetId && !isNewPhotoset) {
          await addPhotoToPhotoset(auth, photosetId, photoId);
        }

        const groupErrors: string[] = [];
        for (const groupId of submittedValues.groups ?? []) {
          try {
            await addPhotoToGroup(auth, groupId, photoId);
          } catch (error) {
            groupErrors.push(String(error));
          }
        }

        toast.style = Toast.Style.Success;
        toast.title = "Photo uploaded";
        toast.message =
          groupErrors.length > 0
            ? "Upload succeeded, but one or more group posts failed."
            : `Photo ID ${photoId}`;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Upload failed";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
  });

  const auth = authPromise.data;
  const context = contextPromise.data ?? { photosets: [], groups: [] };

  if (authPromise.isLoading) {
    return <Form isLoading navigationTitle="Upload Photo" />;
  }

  if (!auth) {
    return (
      <List navigationTitle="Upload Photo">
        <List.EmptyView
          title="Flickr is not connected"
          description="Open the setup command first and complete the Flickr OAuth flow."
          actions={
            <ActionPanel>
              <Action
                title="Open Setup Flickr"
                icon={Icon.Gear}
                onAction={() => launchCommand({ name: "setup-flickr", type: LaunchType.UserInitiated })}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <Form
      isLoading={contextPromise.isLoading}
      enableDrafts
      navigationTitle="Upload Photo"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload Photo" icon={Icon.Upload} onSubmit={handleSubmit} />
          <Action
            title="Open Setup Flickr"
            icon={Icon.Gear}
            onAction={() => launchCommand({ name: "setup-flickr", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Connected Account" text={`${auth.username} (${auth.userNsid})`} />
      <Form.FilePicker title="Image" allowMultipleSelection={false} canChooseDirectories={false} {...itemProps.image} />
      <Form.TextField title="Title" placeholder="Photo title" {...itemProps.title} />
      <Form.TextArea title="Description" placeholder="Short Flickr description" {...itemProps.description} />
      <Form.TextArea title="Tags" placeholder="Comma-separated tags" {...itemProps.tags} />
      <Form.Dropdown title="Visibility" {...itemProps.visibility}>
        <Form.Dropdown.Item value="private" title="Private" />
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="friends" title="Friends" />
        <Form.Dropdown.Item value="family" title="Family" />
        <Form.Dropdown.Item value="friends_family" title="Friends and Family" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown title="Album" storeValue {...itemProps.photosetId}>
        <Form.Dropdown.Item value="" title="No existing album" />
        {context.photosets.map((photoset) => (
          <Form.Dropdown.Item key={photoset.id} value={photoset.id} title={photoset.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="New Album Title"
        placeholder="Optional: create a new album from this photo"
        {...itemProps.newPhotosetTitle}
      />
      <Form.TagPicker title="Groups" {...itemProps.groups}>
        {context.groups.map((group) => (
          <Form.TagPicker.Item key={group.id} value={group.id} title={group.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}