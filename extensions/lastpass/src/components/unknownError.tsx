import { Detail } from "@raycast/api";

export const UnknownError = ({ error }: { error: string }) => (
  <Detail
    markdown={[
      "# Oops! Something went wrong!",
      "Please check error for more information.",
      "  \n",
      "  \n",
      "```error",
      error,
      "```",
    ].join("\n")}
  ></Detail>
);
