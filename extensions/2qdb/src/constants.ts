import { Color } from "@raycast/api";

export const DATABASE_TYPE = [
  {
    value: "postgres",
    title: "Postgres",
    icon: "postgres.png",
  },
  // {
  //   value: "mysql",
  //   title: "MySQL",
  //   icon: "mysql.png",
  // },
];

export enum LOCAL_STORAGE_TYPE {
  HISTORY = "history",
  CONFIG_DATA = "configData",
}

export enum DEVELOP_ENV {
  LOCAL = "LOCAL",
  STAG = "STAG",
  PROD = "PROD",
  TEST = "TEST",
}

export const ENV_LIST = [
  {
    label: "Local",
    value: DEVELOP_ENV.LOCAL,
    color: "#273c75",
    colorLabel: Color.Blue,
  },
  {
    label: "Stag",
    value: DEVELOP_ENV.STAG,
    color: "#e1b12c",
    colorLabel: Color.Yellow,
  },
  {
    label: "Prod",
    value: DEVELOP_ENV.PROD,
    color: "#44bd32",
    colorLabel: Color.Green,
  },
  {
    label: "Test",
    value: DEVELOP_ENV.TEST,
    color: "#8c7ae6",
    colorLabel: Color.Purple,
  },
];
