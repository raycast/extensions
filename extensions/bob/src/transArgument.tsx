import { callBob } from "./utils";
import { LaunchProps } from "@raycast/api";

export default async (props: LaunchProps<{ arguments: Arguments.MyCommand }>) => {
  await callBob(`{|path|:"translate", body:{action:"translateText", |text|:"${props.arguments.src}"}}`);
};
