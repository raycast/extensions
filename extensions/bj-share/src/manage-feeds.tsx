import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useManageFeeds } from "./hooks/useManageFeeds";

export default function ManageFeeds() {
  const { feeds, isLoading, handleAddFeed, handleSubmit } = useManageFeeds();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Feeds" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <Action
            title="Add New Feed"
            icon={Icon.Plus}
            onAction={handleAddFeed}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure your RSS feeds below. Press Cmd+Enter to save. Leave fields blank to remove." />
      <Form.Separator />

      {feeds.map((feed, index) => {
        return [
          <Form.Description key={`space_${index + 1}`} text={`-- Feed ${index + 1} --`} />,
          <Form.TextField
            key={`name_${feed.id}`}
            id={`name_${feed.id}`}
            title="Name"
            placeholder="Ex: Free Torrents"
            defaultValue={feed.name}
          />,
          <Form.TextField
            key={`url_${feed.id}`}
            id={`url_${feed.id}`}
            title="RSS URL"
            placeholder="https://bj-share.info/torrentrss.php?..."
            defaultValue={feed.url}
          />,
          <Form.Description key={`space_${feed.id}`} text={""} />,
        ];
      })}
    </Form>
  );
}
