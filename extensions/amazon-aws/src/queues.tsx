import { getPreferenceValues, ActionPanel, List, Detail, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import AWS from "aws-sdk";
import setupAws from "./util/setupAws";
import { Preferences } from "./types";

setupAws();
const preferences: Preferences = getPreferenceValues();
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
    async function fetch(token?: string, queues?: string[]): Promise<string[]> {
      const { NextToken, QueueUrls } = await sqs.listQueues({ NextToken: token }).promise();
      const combinedQueues = [...(queues ?? []), ...(QueueUrls ?? [])];

      if (NextToken) {
        fetch(NextToken, combinedQueues);
      }

      return combinedQueues;
    }

    fetch()
      .then((queues) => {
        setState((o) => ({ ...o, loaded: true, queues, showingQueues: queues }));
        loadItems(queues);
      })
      .catch(() => setState((o) => ({ ...o, hasError: true })));
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

  function getAccessories(): List.Item.Accessory[] {
    const _acc: List.Item.Accessory[] = [];
    _acc.push({
      icon: "📨",
      text: attr ? attr.ApproximateNumberOfMessages : "...",
      tooltip: "Approximated Number of Messages",
    });
    _acc.push({
      icon: "✈️",
      text: attr ? attr.ApproximateNumberOfMessagesNotVisible : "...",
      tooltip: "Approximated Number of Messages Not Visible",
    });
    _acc.push({
      icon: "⏰",
      text: attr ? new Date(Number.parseInt(attr.CreatedTimestamp) * 1000).toLocaleDateString() : "...",
      tooltip: "Creation Time",
    });

    return _acc;
  }

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
      icon="sqs-list-icon.png"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" shortcut={{ modifiers: [], key: "enter" }} url={path} />
          <Action.CopyToClipboard title="Copy Path" content={queue} />
        </ActionPanel>
      }
      accessories={getAccessories()}
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
