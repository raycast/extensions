import { Detail } from "@raycast/api";

type ChordErrorProps = {
  msg?: string;
};

export function ChordError(_props: ChordErrorProps) {
  return <Detail markdown="Failed to find piano chord" />;
}
