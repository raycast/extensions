import { Detail } from "@raycast/api";

export default function ChallengeRequired() {
  return (
    <Detail
      markdown={`# Unexpected Format \n The challenge level must be between 0 and 12. The challenge level may also contain a decimal to be between 0 and 1.`}
    />
  );
}
