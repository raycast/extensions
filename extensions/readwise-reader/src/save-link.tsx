import { LaunchProps } from "@raycast/api";
import { handleSave } from "./utils/handleSave";
import { getArgumentOrCurrentTabUrl } from "./utils/getArgumentOrCurrentTabUrl";
import handleError from "./utils/handleError";

export default async function Main(props: LaunchProps<{ arguments: Arguments.SaveLink }>) {
  const { url, author, tags } = props.arguments;
  try {
    const resolvedUrl = await getArgumentOrCurrentTabUrl(url);
    await handleSave(resolvedUrl, author, tags);
  } catch (error) {
    await handleError(error as Error);
  }
}
