import { Codespace } from "../types";

export const groupByCompute = (codespaces: Codespace[]) =>
  codespaces.reduce<{
    [compute: string]: Codespace[];
  }>((acc, c) => {
    const machine = c.machine?.display_name
      ? c.machine?.display_name
      : "No info";
    if (!acc[machine]) {
      acc[machine] = [];
    }
    acc[machine].push(c);
    return acc;
  }, {});
export const groupByRepository = (codespaces: Codespace[]) =>
  codespaces.reduce<{
    [repository: string]: Codespace[];
  }>((acc, c) => {
    const repo = c.repository
      ? `${c.repository?.owner.login}/${c.repository?.name}`
      : "No repository";
    if (!acc[repo]) {
      acc[repo] = [];
    }
    acc[repo].push(c);
    return acc;
  }, {});
export const groupByOwner = (codespaces: Codespace[]) =>
  codespaces.reduce<{
    [ownerLogin: string]: Codespace[];
  }>((acc, c) => {
    if (!acc[c.billable_owner.login]) {
      acc[c.billable_owner.login] = [];
    }
    acc[c.billable_owner.login].push(c);
    return acc;
  }, {});
