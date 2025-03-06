import { Detail } from "@raycast/api";

export default function Unauthorized() {
  return (
    <Detail
      markdown={`# Unauthorized Request \n Your Oura Personal Access Token is invalid. [Create a new one here](https://cloud.ouraring.com/personal-access-tokens).`}
    />
  );
}
