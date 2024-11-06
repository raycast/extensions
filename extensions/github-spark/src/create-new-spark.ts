import { LaunchProps, open } from "@raycast/api";

export default async function main(props: LaunchProps<{ arguments: { topic: string } }>) {
  const topic = props.arguments.topic;
  open(`https://spark.githubnext.com/new/${encodeURIComponent(topic)}`);
}
