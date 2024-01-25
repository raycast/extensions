import { Action, Detail, useNavigation } from "@raycast/api";
import CustomActionPanel from "./CustomActionPanel";
import { usePromise } from "@raycast/utils";
import { getSources } from "../store";
import { omit } from "lodash";
// import dayjs from "dayjs";

export default function SourcesJson() {
  const { data: sources, isLoading } = usePromise(getSources);
  const { pop } = useNavigation();
  const jsonStr = isLoading
    ? ""
    : JSON.stringify(
        (sources || []).map((s) => omit(s, ["id"])),
        null,
        4,
      );
  const md = `\`\`\`json\n${jsonStr}\n\`\`\``;

  return (
    <Detail
      navigationTitle="Export All Sources"
      actions={
        <CustomActionPanel>
          <Action.CopyToClipboard
            title="Copy Content"
            content={jsonStr}
            onCopy={() => {
              pop();
            }}
          />
        </CustomActionPanel>
      }
      markdown={md}
    />
  );
}
