import { getArguments, mergeText } from "./utils/common-util";
import { closeMainWindow, LaunchProps } from "@raycast/api";
import { MergeArguments, MergeNum, MergeOrder } from "./types/types";

export default async (props: LaunchProps<{ arguments: MergeArguments }>) => {
  await closeMainWindow();
  const { args } = getArguments([props.arguments.mergeNum, props.arguments.mergeOrder], ["MergeNum", "MergeOrder"]);
  const mergeNum = args[0].length === 0 ? Number(MergeNum.TWO) : Number(args[0]);
  const mergeOrder = args[1].length === 0 ? MergeOrder.FORWARD_ORDER : args[1];
  await mergeText(mergeNum, mergeOrder);
};
