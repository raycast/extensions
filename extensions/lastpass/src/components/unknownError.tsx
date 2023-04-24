import { Detail } from "@raycast/api";

export const UnknownError = ({ error }: { error: Error }) => (
  <Detail
    markdown={[
      "# Oops! Something went wrong!",
      "Please check error for more information.",
      "```error",
      error.stack,
      "```",
    ].join("\n")}
  ></Detail>
);
