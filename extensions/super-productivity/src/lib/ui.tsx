import { Detail, Icon, List } from "@raycast/api";
import {
  getSetupDescription,
  getSetupMarkdown,
  getSetupTitle,
} from "./sp-errors";

export function SetupEmptyView(props: { error: unknown }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={getSetupTitle(props.error)}
      description={getSetupDescription(props.error)}
    />
  );
}

export function SetupDetail(props: { error: unknown }) {
  return <Detail markdown={getSetupMarkdown(props.error)} />;
}
