import { callBob } from "./utils";
import { LaunchProps } from "@raycast/api";

interface TranslateArgs {
  src: string;
}

export default async (props: LaunchProps<{ arguments: TranslateArgs }>) => {
  await callBob(`{|path|:"translate", body:{action:"translateText", |text|:"${props.arguments.src}"}}`);
};
