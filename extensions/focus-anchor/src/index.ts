import { showHUD, LaunchProps, open } from "@raycast/api";

interface FocusArguments {
  commitment: string;
}

const encode = (str: string): string => Buffer.from(str, "binary").toString("base64");

export default async function main(props: LaunchProps<{ arguments: FocusArguments }>) {
  const { commitment } = props.arguments;

  await open("focusanchor://setCommitment/" + encode(commitment)).catch((error) => {
    console.error(error);
    showHUD("Focus Anchor must be installed");
  });
}
