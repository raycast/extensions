import { Detail } from "@raycast/api";
import { ErrorResponse } from "../types";

export default function ErrorView(error: ErrorResponse) {
  return <Detail navigationTitle="Error" markdown={error.errors.join(`\n\n`)} />;
}
