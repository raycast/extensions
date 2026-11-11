import { Action, ActionPanel, Detail } from "@raycast/api";

const TERMINOLOGY_URL = "https://docs.usebouncer.com/terminology";

/**
 * What each field Bouncer returns measures. It describes the fields, never what to do about
 * a particular result: that judgement stays with the sender, as it does everywhere else here.
 */
const GUIDE = `# What the Signals Mean

## Status

**Deliverable.** The mail server confirmed the mailbox exists.

**Risky.** The address may bounce or go unread, for example on a catch-all domain, a full mailbox or a disposable provider.

**Undeliverable.** The syntax is invalid or the mailbox does not exist.

**Unknown.** The mail server did not answer, so Bouncer could not decide.

**Score.** Bouncer's estimate, from 0 to 100, of how likely delivery is to succeed.

## Signals

**Free provider.** The domain is a free mail service.

**Disposable.** The domain hands out temporary, throwaway addresses.

**Accept-all.** The domain's server accepts mail for any address, so a single mailbox there cannot be confirmed.

**Role address.** The address belongs to a function, like support@ or info@, rather than a person. Personal addresses such as mail@ can be flagged too.

**Disabled.** The account exists but is inactive.

**Full mailbox.** The mailbox has run out of storage.

**Toxicity.** A rating from 0 to 5 that Bouncer assigns. Bouncer does not publish what each level means.

**Toxic.** Whether Bouncer flags the domain as toxic.

---

**Unknown** on any signal means Bouncer could not determine it. It is not the same as **No**.
`;

export function SignalGuide() {
  return (
    <Detail
      navigationTitle="What the Signals Mean"
      markdown={GUIDE}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Bouncer's Terminology" url={TERMINOLOGY_URL} />
        </ActionPanel>
      }
    />
  );
}
