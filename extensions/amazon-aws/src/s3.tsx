import fs from "fs";
import { homedir } from "os";
import { Readable } from "stream";
import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  Bucket,
  GetObjectCommand,
  S3Client,
  ListBucketsCommand,
  _Object,
  GetBucketLocationCommand,
  ListObjectsV2Command,
  CommonPrefix,
} from "@aws-sdk/client-s3";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { isReadyToFetch, resourceToConsoleLink } from "./util";

export default function S3() {
  const { data: buckets, error, isLoading, revalidate } = useCachedPromise(fetchBuckets);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter buckets by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        buckets?.map((bucket) => <S3Bucket key={bucket.Name} bucket={bucket} />)
      )}
    </List>
  );
}

function S3Bucket({ bucket }: { bucket: Bucket }) {
  return (
    <List.Item
      icon={"aws-icons/s3.png"}
      title={bucket.Name || ""}
      actions={
        <ActionPanel>
          <Action.Push target={<S3BucketObjects bucket={bucket} />} title="List Objects" />
          <Action.OpenInBrowser title="Open in Browser" url={resourceToConsoleLink(bucket.Name, "AWS::S3::Bucket")} />
          <Action.CopyToClipboard title="Copy Name" content={bucket.Name || ""} />
        </ActionPanel>
      }
    />
  );
}

function S3BucketObjects({ bucket, prefix = "" }: { bucket: Bucket; prefix?: string }) {
  const { data: objects, error, isLoading } = useCachedPromise(fetchBucketObjects, [bucket.Name || "", prefix]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter objects by name...">
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        <List.Section title={`Folder: ${prefix || "."}`}>
          {objects?.prefixes.map((commonPrefix) => (
            <List.Item
              key={commonPrefix.Prefix}
              icon={Icon.Folder}
              title={commonPrefix.Prefix?.replace(prefix, "") || ""}
              actions={
                <ActionPanel>
                  <Action.Push
                    target={<S3BucketObjects bucket={bucket} prefix={commonPrefix.Prefix} />}
                    title="List Objects"
                  />
                  <Action.CopyToClipboard title="Copy Prefix" content={commonPrefix.Prefix || ""} />
                </ActionPanel>
              }
            />
          ))}
          {objects?.objects.map((object) => (
            <List.Item
              key={object.Key}
              icon={Icon.Document}
              title={object.Key?.replace(prefix, "") || ""}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={resourceToConsoleLink(`${bucket.Name}/${object.Key}`, "AWS::S3::Object")}
                  />
                  <Action
                    title="Download"
                    icon={Icon.Download}
                    onAction={async () => {
                      const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading..." });

                      try {
                        const data = await new S3Client({}).send(
                          new GetObjectCommand({ Bucket: bucket.Name, Key: object.Key || "" }),
                        );
                        if (data.Body instanceof Readable) {
                          data.Body.pipe(
                            fs.createWriteStream(`${homedir()}/Downloads/${object.Key?.split("/").pop()}`),
                          );
                        } else {
                          throw new Error("Could not download object");
                        }
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
        </List.Section>
      )}
    </List>
  );
}

async function fetchBuckets() {
  if (!isReadyToFetch()) return [];
  const { Buckets } = await new S3Client({}).send(new ListBucketsCommand({}));

  return Buckets;
}

async function fetchBucketObjects(
  bucket: string,
  prefix: string,
  _region?: string,
  continuationToken?: string,
  objects: _Object[] = [],
  prefixes: CommonPrefix[] = [],
): Promise<{ objects: _Object[]; prefixes: CommonPrefix[] }> {
  const region =
    _region || (await new S3Client({}).send(new GetBucketLocationCommand({ Bucket: bucket }))).LocationConstraint;
  const { Contents, CommonPrefixes, NextContinuationToken } = await new S3Client({ region }).send(
    new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken, Delimiter: "/", Prefix: prefix }),
  );

  const combinedObjects = [...objects, ...(Contents || [])];
  const combinedPrefixes = [...prefixes, ...(CommonPrefixes || [])];

  if (NextContinuationToken) {
    return fetchBucketObjects(bucket, prefix, region, NextContinuationToken, combinedObjects);
  }

  return { objects: combinedObjects, prefixes: combinedPrefixes };
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
