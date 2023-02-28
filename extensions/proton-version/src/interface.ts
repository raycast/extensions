export type Version = {
  version: string;
  commit: string;
  branch: string;
  date: string;
  mode: string;
};

export type ProtonProduct = "proton-mail" | "proton-drive" | "proton-calendar" | "proton-account";

export type ProtonEnv = "default" | "beta";
