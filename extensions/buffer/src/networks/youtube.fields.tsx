import { Form } from "@raycast/api";
import { YOUTUBE_CATEGORIES } from "./youtube";

export function YoutubeFields() {
  return (
    <>
      <Form.Separator />
      <Form.TextField
        id="youtubeTitle"
        title="YouTube Title"
        placeholder="The title of the YouTube video"
      />
      <Form.Dropdown
        id="youtubeCategoryId"
        title="YouTube Category"
        defaultValue="22"
      >
        {YOUTUBE_CATEGORIES.map((c) => (
          <Form.Dropdown.Item key={c.value} value={c.value} title={c.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="youtubePrivacy"
        title="Privacy Status"
        defaultValue="public"
      >
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="private" title="Private" />
        <Form.Dropdown.Item value="unlisted" title="Unlisted" />
      </Form.Dropdown>
      <Form.Dropdown id="youtubeLicense" title="License" defaultValue="youtube">
        <Form.Dropdown.Item value="youtube" title="Standard YouTube License" />
        <Form.Dropdown.Item
          value="creativeCommon"
          title="Creative Commons - Attribution"
        />
      </Form.Dropdown>
      <Form.Checkbox
        id="youtubeMadeForKids"
        label="Made for Kids"
        defaultValue={false}
      />
      <Form.Checkbox
        id="youtubeEmbeddable"
        label="Allow Embedding"
        defaultValue={true}
      />
      <Form.Checkbox
        id="youtubeNotifySubscribers"
        label="Notify Subscribers"
        defaultValue={true}
      />
    </>
  );
}
