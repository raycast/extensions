import type { LaunchProps } from "@raycast/api";
import { SendEmailForm, type SendEmailValues } from "./components/SendEmailForm";

export default function SendEmail(
  props: LaunchProps<{ draftValues: SendEmailValues; launchContext?: { to?: string } }>,
) {
  return (
    <SendEmailForm
      enableDrafts
      draftValues={props.draftValues}
      initial={props.launchContext?.to ? { to: props.launchContext.to } : undefined}
    />
  );
}
