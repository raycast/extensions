import { personalAccessToken } from "../preferences";
import { Codespace } from "../types";
import { default as nodeFetch } from "node-fetch";

const handleRename = async ({
  codespace,
  name,
}: {
  codespace: Codespace;
  name: string;
}) => {
  return await nodeFetch(`${codespace.url}`, {
    method: "PATCH",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${personalAccessToken}`,
    },
    body: JSON.stringify({
      display_name: name,
    }),
  });
};
export default handleRename;
