import { showHUD, Clipboard } from "@raycast/api";
import { typeid } from "typeid-js";

interface TypeIDArguments {
  typeOfId?: string;
}

export default async (props: { arguments: TypeIDArguments }) => {
  const { typeOfId } = props.arguments;

  const value = (typeOfId ? typeid(typeOfId) : typeid()).toString();

  await Clipboard.copy(value);

  await showHUD(`✅ Copied ${value} to clipboard.`);
};
