import { LaunchProps, open } from "@raycast/api";

export default async (props: LaunchProps) => {
  const { query } = props.arguments;

  open(`https://developer.servicenow.com/dev.do#!/search/tokyo/All/${query}`);
};
