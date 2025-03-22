import { Detail } from "@raycast/api";

const errorInstructions = {
  loginError: "Please check your email and password and try again.",
};

export const ErrorView = ({ error }: { error: Error }) => {
  const instruction = errorInstructions[error.message as keyof typeof errorInstructions] || error.message;

  return (
    <Detail
      markdown={`# Error

> ${instruction}
`}
    />
  );
};

export default ErrorView;
