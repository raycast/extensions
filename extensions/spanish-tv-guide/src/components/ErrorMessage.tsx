import { Detail } from "@raycast/api";

export const ERROR_MESSAGE = "Error fetching TV guide";
export const ErrorMessage = () => <Detail markdown={formattedError(ERROR_MESSAGE)} />;

const formattedError = (error: string) => `
|         ❗         |
| :----------------: |
|      ${error}      |`;
