export type Application = {
  name: string;
  pid: number;
  path: string;
  fileIcon: string;
};

export type State = {
  query: string;
  isLoading: boolean;
  applications: Application[];
};

export const ConfirmActionTypes = {
  QUIT: "Quit",
  FORCE_QUIT: "Force Quit",
  RESTART: "Restart",
} as const;

export type ConfirmActionType = typeof ConfirmActionTypes[keyof typeof ConfirmActionTypes];
