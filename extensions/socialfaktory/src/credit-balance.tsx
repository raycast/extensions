import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { useRef } from "react";
import { SignInAgainAction } from "./components/sign-in-again";
import { SITE_URL, authorize, personalToken } from "./lib/auth";
import { WRITE_RESERVE_CREDITS, getWallet } from "./lib/socialfaktory";

function credits(value: number): string {
  return `${value.toLocaleString("en-US")} ${value === 1 ? "credit" : "credits"}`;
}

function CreditBalance() {
  const abortable = useRef<AbortController>(null);
  const { data, isLoading, revalidate } = usePromise(() => getWallet(abortable.current?.signal), [], {
    abortable,
    failureToastOptions: { title: "Could not read your credit balance" },
  });

  const markdown = data
    ? [
        `# ${credits(data.available_balance)} available`,
        `${credits(data.reserved_balance)} reserved by work in progress, ${credits(data.total_balance)} in total.`,
        `Writing a post reserves ${WRITE_RESERVE_CREDITS} credits and settles at what it used.`,
      ].join("\n\n")
    : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Available" text={credits(data.available_balance)} />
            <Detail.Metadata.Label title="Reserved" text={credits(data.reserved_balance)} />
            <Detail.Metadata.Label title="Total" text={credits(data.total_balance)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Account" text="Open SocialFaktory" target={SITE_URL} />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open SocialFaktory" url={SITE_URL} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <SignInAgainAction onSignedIn={revalidate} />
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken({ authorize, personalAccessToken: personalToken() })(CreditBalance);
