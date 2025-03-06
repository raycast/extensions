import { Action, Detail, Icon, Toast, showToast } from "@raycast/api";
import { Digest } from "../types";
import CustomActionPanel from "./CustomActionPanel";
import SharableLinkAction from "./SharableLinkAction";
import { saveFileAs } from "../utils/file";
import { useEffect } from "react";
import { addDigestGenerationCount } from "../store";
import { usePromise } from "@raycast/utils";
import { getFeedbackContent } from "../utils/biz";
// import dayjs from "dayjs";

export default function DigestDetail({ digest }: { digest: Digest }) {
  const prefix = "";
  // const prefix = `# ${digest.title}  \`at ${dayjs(digest.createAt).format('HH:mm')}\`\n\n`;
  const md = `${prefix}${digest.content}`;
  const { data: feedbackContent = "" } = usePromise(getFeedbackContent);

  useEffect(() => {
    setTimeout(() => {
      addDigestGenerationCount();
    }, 300);
  }, []);

  return (
    <Detail
      navigationTitle={digest.title}
      actions={
        <CustomActionPanel>
          <Action
            title="Export As Markdown File"
            icon={Icon.Download}
            onAction={async () => {
              try {
                const flag = await saveFileAs(md, `${digest.title.replaceAll(/\s/g, "-")}.md`);
                if (flag) {
                  showToast(Toast.Style.Success, "File saved");
                }
              } catch (err: any) {
                showToast(Toast.Style.Failure, "Failed to save file", err.message);
                console.error("Failed to save file", err);
              }
            }}
          />
          <Action.CopyToClipboard title="Copy Content" content={md} />
          <SharableLinkAction
            actionTitle="Share This Digest"
            articleTitle={digest.title}
            articleContent={digest.content}
          />
        </CustomActionPanel>
      }
      markdown={feedbackContent + md}
    />
  );
}
