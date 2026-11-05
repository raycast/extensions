import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import EmailList from "./components/EmailList";
import { withSparkCLI } from "./components/SparkSetup";

interface InboxView {
  id: string;
  title: string;
  filter?: string;
  newSenders?: boolean;
}

// Smart Categories, in the order Spark suggests triaging them.
const VIEWS: InboxView[] = [
  { id: "inbox", title: "Inbox" },
  { id: "unread", title: "Unread", filter: "is:unread" },
  { id: "priority", title: "Priority", filter: "category:priority" },
  { id: "people", title: "People", filter: "category:personal" },
  { id: "invitations", title: "Invitations", filter: "category:invitation" },
  { id: "notifications", title: "Notifications", filter: "category:notification" },
  { id: "newsletters", title: "Newsletters", filter: "category:newsletter" },
  { id: "pinned", title: "Pinned", filter: "is:pinned" },
  { id: "assigned", title: "Assigned to Me", filter: "assigned_to:me" },
  { id: "new-senders", title: "New Senders", newSenders: true },
];

function Command() {
  const [viewId, setViewId] = useCachedState("inbox-view", "inbox");
  const view = VIEWS.find((v) => v.id === viewId) ?? VIEWS[0];
  const args = ["emails"];
  if (view.filter) args.push("--filter", view.filter);
  if (view.newSenders) args.push("--new-senders");

  return (
    <EmailList
      cached
      args={args}
      navigationTitle={`Spark — ${view.title}`}
      isInvitation={view.id === "invitations"}
      isNewSender={view.newSenders}
      emptyTitle={view.id === "inbox" ? "Inbox zero 🎉" : `No ${view.title.toLowerCase()} emails`}
      searchBarAccessory={
        <List.Dropdown tooltip="Smart Category" value={view.id} onChange={setViewId}>
          {VIEWS.map((v) => (
            <List.Dropdown.Item key={v.id} value={v.id} title={v.title} />
          ))}
        </List.Dropdown>
      }
    />
  );
}

export default withSparkCLI(Command);
