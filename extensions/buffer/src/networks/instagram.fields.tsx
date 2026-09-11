import { Form } from "@raycast/api";

export function InstagramFields({ isProfile }: { isProfile: boolean }) {
  if (isProfile) {
    return (
      <>
        <Form.Separator />
        <Form.Description text="Instagram Profile posts are always standard posts; post type, first comment, and shop grid link are not available." />
      </>
    );
  }

  return (
    <>
      <Form.Separator />
      <Form.Dropdown
        id="instagramPostType"
        title="Post Type"
        defaultValue="post"
      >
        <Form.Dropdown.Item value="post" title="Post" />
        <Form.Dropdown.Item value="story" title="Story" />
        <Form.Dropdown.Item value="reel" title="Reel" />
      </Form.Dropdown>
      <Form.Checkbox
        id="instagramShareToFeed"
        label="Share to Feed"
        defaultValue={true}
        info="Whether the post should also appear on your Instagram feed (relevant for reels and stories)"
      />
      <Form.TextField
        id="instagramFirstComment"
        title="First Comment"
        placeholder="Text for the first comment (optional)"
      />
      <Form.TextField
        id="instagramLink"
        title="Shop Grid Link"
        placeholder="https://example.com (optional)"
      />
    </>
  );
}
