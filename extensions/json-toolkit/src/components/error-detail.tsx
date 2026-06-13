import { Detail } from "@raycast/api";

export function ErrorDetail({ message }: { message: string }) {
  return <Detail markdown={`# Unable to Process Input\n\n${message}`} />;
}
