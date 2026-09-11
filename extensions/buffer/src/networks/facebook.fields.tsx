import { Form } from "@raycast/api";

export function FacebookFields({ isGroup }: { isGroup: boolean }) {
  if (isGroup) {
    return (
      <>
        <Form.Separator />
        <Form.Description text="Facebook Group posts are always standard posts; post type, first comment, and link attachment are not available." />
      </>
    );
  }

  return (
    <>
      <Form.Separator />
      <Form.Dropdown
        id="facebookPostType"
        title="Post Type"
        defaultValue="post"
      >
        <Form.Dropdown.Item value="post" title="Post" />
        <Form.Dropdown.Item value="story" title="Story" />
        <Form.Dropdown.Item value="reel" title="Reel" />
      </Form.Dropdown>
      <Form.TextField
        id="facebookFirstComment"
        title="First Comment"
        placeholder="Text for the first comment (optional)"
      />
      <Form.TextField
        id="facebookLinkAttachment"
        title="Link Attachment URL"
        placeholder="https://example.com (optional)"
        info="URL for a link preview attachment. Mutually exclusive with video assets."
      />
    </>
  );
}
