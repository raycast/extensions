import { Action, Detail } from "@raycast/api";
import { Digest } from "../types";
import CustomActionPanel from "./CustomActionPanel";
// import dayjs from "dayjs";

export default function DigestDetail({ digest }: { digest: Digest }) {
  const prefix = "";
  // const prefix = `# ${digest.title}  \`at ${dayjs(digest.createAt).format('HH:mm')}\`\n\n`;
  const md = `${prefix}${digest.content}`;

  return (
    <Detail
      navigationTitle={digest.title}
      actions={
        <CustomActionPanel>
          <Action.CopyToClipboard title="Copy Content" content={md} />
        </CustomActionPanel>
      }
      markdown={md}
    />
  );
}
