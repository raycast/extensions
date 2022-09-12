import { personalAccessToken } from "../preferences";
import fetch from "node-fetch";
import { Codespace, Machine } from "../types";

const handleChangeCompute = async ({
  codespace,
  machine,
}: {
  codespace: Codespace;
  machine: Machine;
}) => {
  return await fetch(`${codespace.url}`, {
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
