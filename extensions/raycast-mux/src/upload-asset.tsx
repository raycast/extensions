import { Action, ActionPanel, Form, LaunchProps, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { Effect, Fiber, Schema } from "effect";
import RecentAssets from "./recent-assets.js";
import { MuxRepo } from "./lib/MuxRepo.js";
import Runtime, { effectView } from "./lib/Runtime.js";
import Raycast from "raycast-effect";

const UploadForm = Schema.Struct({
  files: Schema.mutable(Schema.Array(Schema.NonEmptyString)),
  privacyPublic: Schema.Boolean,
  privacySigned: Schema.Boolean,
  privacyDrm: Schema.Boolean,
  passthru: Schema.UndefinedOr(Schema.String),
  videoQuality: Schema.Union(Schema.Literal("premium"), Schema.Literal("basic"), Schema.Literal("plus")),
  maxResolutionTier: Schema.Union(Schema.Literal("1080p"), Schema.Literal("1440p"), Schema.Literal("2160p")),
  generateCaptions: Schema.Array(
    Schema.Union(
      Schema.Literal("en"),
      Schema.Literal("es"),
      Schema.Literal("it"),
      Schema.Literal("pt"),
      Schema.Literal("de"),
      Schema.Literal("fr"),
    ),
  ),
});
export interface UploadForm extends Schema.Schema.Type<typeof UploadForm> {}

export default effectView(
  Effect.fn(function* (props: LaunchProps<{ draftValues: UploadForm }>) {
    const mux = yield* MuxRepo;
    const { push } = useNavigation();

    const { itemProps, handleSubmit, reset } = useForm<UploadForm>({
      onSubmit: (values) =>
        Effect.gen(function* () {
          yield* Raycast.Feedback.showToast({
            title: "Preparing upload...",
            style: Toast.Style.Animated,
          });

          const upload = yield* mux.createAsset(values);

          yield* Raycast.Feedback.showToast({
            title: "Uploading...",
            style: Toast.Style.Animated,
          });

          const uploadFiber = yield* Effect.fork(mux.upload(values.files[0], upload));

          yield* Fiber.join(uploadFiber);

          yield* Raycast.Feedback.showToast({
            title: "Upload Successful",
          });
          yield* Effect.sleep("1.5 seconds");
          yield* Effect.promise(async () => {
            reset();
            return push(<RecentAssets />);
          });
        }).pipe(Effect.scoped, Runtime.runPromise),
      validation: {
        files: FormValidation.Required,
        videoQuality: FormValidation.Required,
        maxResolutionTier: FormValidation.Required,
      },
      initialValues: {
        privacyPublic: true,
        videoQuality: "plus",
        maxResolutionTier: "2160p",
        ...props.draftValues,
      },
    });

    return (
      <Form
        enableDrafts
        searchBarAccessory={
          <Form.LinkAccessory
            target="https://www.mux.com/docs/api-reference#video/operation/create-asset"
            text="Open Documentation"
          />
        }
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={handleSubmit} />
            <Action
              title="Reset Form"
              onAction={() =>
                reset({
                  privacyPublic: true,
                  videoQuality: "plus",
                  maxResolutionTier: "2160p",
                })
              }
            />
          </ActionPanel>
        }
      >
        <Form.FilePicker title="Upload Video" allowMultipleSelection={false} {...itemProps.files} />
        <Form.TextField title="Passthru" {...itemProps.passthru} />
        <Form.Separator />
        <Form.Checkbox title="Playback Policy" label="Public" {...itemProps.privacyPublic} />
        <Form.Checkbox label="Signed" {...itemProps.privacySigned} />
        <Form.Checkbox label="DRM" {...itemProps.privacyDrm} />
        {/* @ts-expect-error The form doesn't like the enum... */}
        <Form.Dropdown title="Video Quality" {...itemProps.videoQuality}>
          <Form.Dropdown.Item title="Basic" value="basic" />
          <Form.Dropdown.Item title="Plus" value="plus" />
          <Form.Dropdown.Item title="Premium" value="premium" />
        </Form.Dropdown>
        {/* @ts-expect-error The form doesn't like the enum... */}
        <Form.Dropdown title="Max Resolution" {...itemProps.maxResolutionTier}>
          <Form.Dropdown.Item title="1080p" value="1080p" />
          <Form.Dropdown.Item title="1440p" value="1440p" />
          <Form.Dropdown.Item title="4k" value="2160p" />
        </Form.Dropdown>
        {/* @ts-expect-error The form doesn't like the enum... */}
        <Form.TagPicker title="Generate Captions?" placeholder="None" {...itemProps.generateCaptions}>
          <Form.TagPicker.Item icon="🇺🇸" title="English" value="en" />
          <Form.TagPicker.Item icon="🇪🇸" title="Spanish" value="es" />
          <Form.TagPicker.Item icon="🇮🇹" title="Italian" value="it" />
          <Form.TagPicker.Item icon="🇵🇹" title="Portuguese" value="pt" />
          <Form.TagPicker.Item icon="🇩🇪" title="German" value="de" />
          <Form.TagPicker.Item icon="🇫🇷" title="French" value="fr" />
        </Form.TagPicker>
      </Form>
    );
  }),
);
