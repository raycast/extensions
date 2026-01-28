import { LaunchProps, open } from "@raycast/api";
import { ChartType } from "./types";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CreateNew }>) {
  const { chartType } = props.arguments;
  await open(ChartType[chartType]);
}
