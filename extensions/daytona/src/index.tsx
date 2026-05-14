import { Detail } from "@raycast/api";

export default function Command() {
  return <Detail markdown={["# Daytona", "", "Daytona Extension for Raycast.", ""].join("\n")} />;
}
