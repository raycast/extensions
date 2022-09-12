import { personalAccessToken } from "../preferences";
import { Codespace, Machine } from "../types";
import { default as nodeFetch } from "node-fetch";

const handleChangeCompute = async ({
  codespace,
  machine,
}: {
  codespace: Codespace;
  machine: Machine;
}) => {
  return await nodeFetch(`${codespace.url}`, {
    method: "PATCH",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${personalAccessToken}`,
    },
    body: JSON.stringify({
      machine: machine.name,
    }),
  });
};

export default handleChangeCompute;
