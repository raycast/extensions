import { LaunchProps } from "@raycast/api";
import AccountSettings from "./components/account-settings";

export default function Account(props: LaunchProps<{ arguments: Arguments.Account }>) {
  switch (props.arguments.tab) {
    case "settings":
      return <AccountSettings />
    case "api_tokens":
  }
}