import { Detail } from "@raycast/api";
export default function Unresponsive() {
  return (
    <Detail
      markdown={`# Error from Granola \n\n Could not communicate with the Granola service. Please make sure Granola is open, running, and that you are logged in, then try again.`}
    />
  );
}
