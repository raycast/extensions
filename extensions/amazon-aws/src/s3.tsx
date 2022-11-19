import fs from "fs";
import { homedir } from "os";
import { Readable } from "stream";
import { ActionPanel, List, Detail, Action, Icon, showToast, Toast } from "@raycast/api";
import * as AWS from "aws-sdk";
import setupAws from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";

const preferences = setupAws();
const s3 = new AWS.S3();

export default function S3() {
  const { data: buckets, error, isLoading } = useCachedPromise(fetchBuckets);

  if (error) {
    return <Detail markdown="Something went wrong. Try again!" />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter buckets by name...">
      {buckets?.map((bucket) => (
        <S3Bucket key={bucket.Name} bucket={bucket} />
      ))}
    </List>
  );
}

function S3Bucket({ bucket }: { bucket: AWS.S3.Bucket }) {
  return (
    <List.Item
      icon={Icon.Folder}
      title={bucket.Name || ""}
      actions={
        <ActionPanel>
          <Action.Push target={<S3BucketObjects bucket={bucket} />} title="List Objects" />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`https://s3.console.aws.amazon.com/s3/buckets/${bucket.Name || ""}?region=${
              preferences.region
            }&tab=objects`}
          />
          <Action.CopyToClipboard title="Copy Name" content={bucket.Name || ""} />
        </ActionPanel>
      }
      accessories={[{ date: bucket.CreationDate }]}
    />
  );
}

function S3BucketObjects({ bucket }: { bucket: AWS.S3.Bucket }) {
  const { data: objects, error, isLoading } = useCachedPromise(fetchBucketObjects, [bucket.Name || ""]);

  if (error) {
    return <Detail markdown="Something went wrong. Try again!" />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter objects by name...">
      {objects?.map((object) => (
        <List.Item
          key={object.Key || ""}
          icon={Icon.Document}
          title={object.Key || ""}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Browser"
                url={`https://s3.console.aws.amazon.com/s3/object/${bucket.Name || ""}?region=${
                  preferences.region
                }&prefix=${object.Key || ""}`}
              />
              <Action.SubmitForm
                title="Download"
                onSubmit={async () => {
                  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading..." });

                  try {
                    const data = await s3.getObject({ Bucket: bucket.Name || "", Key: object.Key || "" }).promise();
                    Readable.from(data.Body as Buffer).pipe(
                      fs.createWriteStream(`${homedir()}/Downloads/${object.Key?.split("/").pop()}`)
                    );
                    toast.style = Toast.Style.Success;
                    toast.title = "Downloaded to Downloads folder";
                  } catch (err) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to download";
                  }
                }}
              />
              <Action.CopyToClipboard title="Copy Key" content={object.Key || ""} />
            </ActionPanel>
          }
          accessories={[{ text: humanFileSize(object.Size || 0) }]}
        />
      ))}
    </List>
  );
}

async function fetchBuckets() {
  const { Buckets } = await s3.listBuckets().promise();

  return Buckets;
}

async function fetchBucketObjects(
  bucket: string,
  nextMarker?: string,
  objects: AWS.S3.Object[] = []
): Promise<AWS.S3.ObjectList> {
  const { Contents, NextMarker } = await s3.listObjects({ Bucket: bucket, Marker: nextMarker }).promise();

  const combinedObjects = [...objects, ...(Contents || [])];

  if (NextMarker) {
    return fetchBucketObjects(bucket, NextMarker, combinedObjects);
  }

  return combinedObjects;
}

// inspired by https://stackoverflow.com/a/14919494
function humanFileSize(bytes: number) {
  const threshold = 1000;

  if (Math.abs(bytes) < threshold) {
    return bytes + " B";
  }

  const units = ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let u = -1;
  const r = 10;

  do {
    bytes /= threshold;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= threshold && u < units.length - 1);

  return bytes.toFixed() + " " + units[u];
}
