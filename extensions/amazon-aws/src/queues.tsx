import { getPreferenceValues, ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
var AWS = require('aws-sdk');

interface Preferences {
  region: string;
}

const preferences: Preferences = getPreferenceValues();
AWS.config.update({region: preferences.region});
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

export default function ListSQSQueues() {
  const [state, setState] = useState<{ loaded: boolean, queues: string[], showingQueues: string[], attributes: QueueAttributes[],  hasError: boolean }>({ loaded: false, queues: [], showingQueues: [], attributes: [], hasError: false });

  let loadItems = async function(q: string[]) {
    let att: any[] = [];

    for (let i = 0; i < q.length; i++) {
      att.push(getQueue(q[i]));
    }

    for (let i = 0; i < att.length; i++) {
      let result = await att[i];
      att[i] = {...result.Attributes, Name: q[i]};
    }

    setState(o => {
      o.attributes = att;
      return {...o};
    });
  };

  useEffect(() => {
    async function fetch() {
      await sqs.listQueues({}, function(err: { stack: any; }, data: any) {
        if (err) {
          setState(o => ({
            ...o,
            hasError: true
          }));
        } else {
          setState(o => ({
            ...o, 
            loaded: true,
            queues: data.QueueUrls,
            showingQueues: data.QueueUrls,
          }));
          loadItems(data.QueueUrls);
        }
      });
    }
    fetch();
  }, []);

  if (state.hasError) {
    return (<Detail markdown="No valid [configuration and credential file] (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />)
  }
  
  return (
    <List isLoading={!state.loaded} searchBarPlaceholder="Filter queues by name..." >
      {state.showingQueues.map((i, k) => {
        let attr = state.attributes.find((a: QueueAttributes) => i === a.Name);
          return (
            <QueueListItem key={k} queue={i} attributes={attr} />
          )
        })}
    </List>
  );
}

function QueueListItem(props: { queue: string, attributes: QueueAttributes|undefined }) {
  const queue = props.queue;
  const attr = props.attributes;
  let displayName = (queue.split('/').at(-1) ?? "").replace(/-/g, ' ').replace(/\./g, ' ');

  let subtitle = attr !== undefined ?
    "📨 " + attr.ApproximateNumberOfMessages + "  ✈️ " + attr.ApproximateNumberOfMessagesNotVisible :
    '';

  let accessoryTitle = attr !== undefined ?
    new Date(Number.parseInt(attr.CreatedTimestamp) * 1000).toLocaleDateString() :
    '';

    let path = "https://" + preferences.region + ".console.aws.amazon.com/sqs/v2/home?region=" + preferences.region + "#/queues/" + encodeURIComponent(queue);

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

function getQueue(q:string) {
    return sqs.getQueueAttributes({QueueUrl: q, AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible', 'CreatedTimestamp']}).promise();
}
