import { LaunchProps } from "@raycast/api";
import { QueryContent } from "./query-content";

export default function Query(props: LaunchProps<{ arguments: { video: string } }>) {
  const { video } = props.arguments;
  return <QueryContent video={video} type="transcript" />;
}
