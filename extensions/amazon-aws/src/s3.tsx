import fs from "fs";
import { homedir } from "os";
import { Readable } from "stream";
import { ActionPanel, List, Action, Icon, showToast, Toast, Detail, Image } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import {
  Bucket,
  GetObjectCommand,
  S3Client,
  ListBucketsCommand,
  _Object,
  GetBucketLocationCommand,
  ListObjectsV2Command,
  CommonPrefix,
  GetBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";

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
      key={bucket.Name}
      icon={{ source: "aws-icons/s3.png", mask: Image.Mask.RoundedRectangle }}
      title={bucket.Name!}
      actions={
        <ActionPanel>
          <Action.Push target={<S3BucketObjects bucket={bucket} />} title="List Objects" icon={Icon.Document} />
          <Action.Push target={<S3BucketPolicy bucket={bucket} />} title="Show Bucket Policy" icon={Icon.Key} />{" "}
          <AwsAction.Console url={resourceToConsoleLink(bucket.Name, "AWS::S3::Bucket")} />
          <Action.CopyToClipboard title="Copy Name" content={bucket.Name || ""} />
          <Action.CopyToClipboard title="Copy ARN" content={"arn:aws:s3:::" + bucket.Name || ""} />
        </ActionPanel>
      }
    />
  );
}

function S3BucketObjects({ bucket, prefix = "" }: { bucket: Bucket; prefix?: string }) {
  const [isReversedOrder, setReversedOrder] = useCachedState<boolean>("reverse-order", false, {
    cacheNamespace: "aws-s3",
  });
  const {
    data: objects,
    error,
    isLoading,
  } = useCachedPromise(fetchBucketObjects, [bucket.Name!, prefix, isReversedOrder]);

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
                    icon={Icon.Document}
                  />
                  <Action
                    title={`${isReversedOrder ? "Standard" : "Reversed"} Order`}
                    onAction={() => setReversedOrder(!isReversedOrder)}
                    icon={Icon.Switch}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <AwsAction.Console
                    url={resourceToConsoleLink(`${bucket.Name}/${commonPrefix.Prefix}`, "AWS::S3::Bucket")}
                  />
                  <Action.CopyToClipboard title="Copy Prefix" content={commonPrefix.Prefix || ""} />
                  <Action.CopyToClipboard
                    title="Copy S3 URI"
                    content={"s3://" + bucket.Name + "/" + (commonPrefix.Prefix || "")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  />
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
                  <AwsAction.Console url={resourceToConsoleLink(`${bucket.Name}/${object.Key}`, "AWS::S3::Object")} />
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
                      } catch (_err) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Failed to download";
                      }
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Key" content={object.Key || ""} />
                  <Action.CopyToClipboard
                    title="Copy S3 URI"
                    content={"s3://" + bucket.Name + "/" + (object.Key || "")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  />
                  <Action
                    title={`${isReversedOrder ? "Standard" : "Reversed"} Order`}
                    onAction={() => setReversedOrder(!isReversedOrder)}
                    icon={Icon.Switch}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
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

function S3BucketPolicy({ bucket }: { bucket: Bucket }) {
  const { policy, isLoading } = fetchBucketPolicy(bucket.Name!);
  return (
    <Detail
      navigationTitle="Bucket Policy"
      isLoading={isLoading}
      markdown={policy?.markdown || ""}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Policy" content={policy?.value || ""} />
          <AwsAction.Console url={resourceToConsoleLink(bucket.Name, "AWS::S3::BucketPolicy")} />
        </ActionPanel>
      }
    />
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
  isReversedOrder: boolean,
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

  let combinedObjects = [...objects, ...(Contents || [])];
  let combinedPrefixes = [...prefixes, ...(CommonPrefixes || [])];

  if (NextContinuationToken) {
    return fetchBucketObjects(bucket, prefix, isReversedOrder, region, NextContinuationToken, combinedObjects);
  }
  if (isReversedOrder) {
    combinedObjects = combinedObjects.reverse();
    combinedPrefixes = combinedPrefixes.reverse();
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

export const fetchBucketPolicy = (bucket: string) => {
  const {
    data: policy,
    error,
    isLoading,
  } = useCachedPromise(
    async (bucket: string) => {
      const { Policy = "❗Not Yet Defined" } = await new S3Client({}).send(
        new GetBucketPolicyCommand({ Bucket: bucket }),
      );
      let md = "## Bucket Policy\n\n```";
      let value = Policy;

      try {
        const json = JSON.parse(Policy.toString() || "");
        md += `json\n${JSON.stringify(json, null, 4)}`;
        value = JSON.stringify(json, null, 4);
      } catch (error) {
        md += `text\n${Policy.toString()}`;
      }

      return { value, markdown: md + "\n```" };
    },
    [bucket],
    { execute: isReadyToFetch(), failureToastOptions: { title: "Failed to load bucket policy" } },
  );

  return { policy, isLoading: (!policy && !error) || isLoading };
};
