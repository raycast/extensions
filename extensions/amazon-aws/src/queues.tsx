import {
  getPreferenceValues,
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import AWS from "aws-sdk";

interface Preferences {
  region: string;
}

const preferences: Preferences = getPreferenceValues();
AWS.config.update({ region: preferences.region });
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

export default function ListSQSQueues() {
  const [state, setState] = useState<{
    loaded: boolean;
    queues: string[];
    showingQueues: string[];
    attributes: QueueAttributes[];
    hasError: boolean;
  }>({ loaded: false, queues: [], showingQueues: [], attributes: [], hasError: false });

  const loadItems = async function (q: string[]) {
    const att: ReturnType<typeof getQueue>[] = [];

    for (let i = 0; i < q.length; i++) {
      att.push(getQueue(q[i]));
    }

    const attributes: QueueAttributes[] = [];

    for (let i = 0; i < att.length; i++) {
      const result = await att[i];
      attributes.push({ ...result.Attributes, Name: q[i] } as QueueAttributes);
    }

    setState((o) => {
      return { ...o, attributes };
    });
  };

  useEffect(() => {
    async function fetch() {
      await sqs.listQueues({}, function (err, data) {
        if (err) {
          setState((o) => ({
            ...o,
            hasError: true,
          }));
        } else {
          setState((o) => ({
            ...o,
            loaded: true,
            queues: data.QueueUrls || [],
            showingQueues: data.QueueUrls || [],
          }));
          loadItems(data.QueueUrls || []);
        }
      });
    }
    fetch();
  }, []);

  if (state.hasError) {
    return (
      <Detail markdown="No valid [configuration and credential file] (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />
    );
  }

  return (
    <List isLoading={!state.loaded} searchBarPlaceholder="Filter queues by name...">
      {state.showingQueues.map((i, k) => {
        const attr = state.attributes.find((a: QueueAttributes) => i === a.Name);
        return <QueueListItem key={k} queue={i} attributes={attr} />;
      })}
    </List>
  );
}

function QueueListItem(props: { queue: string; attributes: QueueAttributes | undefined }) {
  const queue = props.queue;
  const attr = props.attributes;
  const displayName = (queue.split("/").at(-1) ?? "").replace(/-/g, " ").replace(/\./g, " ");

  const subtitle =
    attr !== undefined
      ? "📨 " + attr.ApproximateNumberOfMessages + "  ✈️ " + attr.ApproximateNumberOfMessagesNotVisible
      : "";

  const accessoryTitle =
    attr !== undefined ? new Date(Number.parseInt(attr.CreatedTimestamp) * 1000).toLocaleDateString() : "";

  const path =
    "https://" +
    preferences.region +
    ".console.aws.amazon.com/sqs/v2/home?region=" +
    preferences.region +
    "#/queues/" +
    encodeURIComponent(queue);

  return (
    <List.Item
      id={queue}
      key={queue}
      title={displayName ?? ""}
      subtitle={subtitle}
      icon="sqs-list-icon.png"
      accessoryTitle={accessoryTitle}
      actions={
        <ActionPanel>
          <OpenInBrowserAction title="Open in Browser" shortcut={{ modifiers: [], key: "enter" }} url={path} />
          <CopyToClipboardAction title="Copy Path" content={queue} />
        </ActionPanel>
      }
    />
  );
}

type QueueAttributes = {
  Name: string;
  ApproximateNumberOfMessages: string;
  ApproximateNumberOfMessagesNotVisible: string;
  CreatedTimestamp: string;
};

function getQueue(q: string) {
  return sqs
    .getQueueAttributes({
      QueueUrl: q,
      AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible", "CreatedTimestamp"],
    })
    .promise();
}
