import { FormValue } from "@raycast/api";

import gitmoji from "../data/gitmoji";

interface Props {
  format: string;
  type: string;
  values: Record<string, FormValue>;
}

const formatDescription = ({ format, type: _type, values }: Props) => {
  const type = gitmoji?.types[_type];

  const hasEmoji = format.toString().includes("emoji");
  const scope = values?.ccScope;

  const description = format
    .toString()
    .replace(/\{emoji\}/g, type?.emoji)
    .replace(/\{scope\}/g, values?.ccScope ? (hasEmoji ? ` (${scope})` : `(${scope})`) : "")
    .replace(/\{description\}/g, values?.ccDescription ? values?.ccDescription.toString() : "")
    .replace(/\{type\}/g, type?.commit);

  return description;
};

export default formatDescription;
