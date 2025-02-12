import type { Dispatch, SetStateAction } from "react";
import { Action, Icon } from "@raycast/api";
import { ImageDetail } from "@/components/image-detail";

export function RevealImageAction(props: {
  imageURL: string;
  size: string;
  autoRefresh?: boolean;
  setRefresh?: Dispatch<SetStateAction<number>>;
}) {
  const { imageURL, size } = props;
  const autoRefresh = typeof props.autoRefresh === "undefined" ? false : props.autoRefresh;
  const setRefresh =
    typeof props.setRefresh === "undefined"
      ? () => {
          return;
        }
      : props.setRefresh;

  return (
    <>
      <Action.Push
        icon={Icon.Maximize}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
        title={"Preview Image"}
        target={<ImageDetail imageURL={imageURL} size={size} autoRefresh={autoRefresh} setRefresh={setRefresh} />}
      />
      <Action.OpenInBrowser shortcut={{ modifiers: ["cmd"], key: "o" }} url={imageURL} />
    </>
  );
}
