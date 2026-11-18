import { List, Icon, ActionPanel } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { alwaysdata } from "./alwaysdata";
import { Mailbox } from "./types";
import OpenInAlwaysdata from "./components/open-in-alwaysdata";

export default function Emails() {
  const {
    isLoading,
    data: { domains, emails },
  } = useCachedPromise(
    async () => {
      const [domains, emails] = await Promise.all([alwaysdata.domains.list(), alwaysdata.emails.list()]);
      return { domains: [{ id: 1, name: "alwaysdata.net" }, ...domains], emails };
    },
    [],
    {
      initialData: { domains: [], emails: [] },
    },
  );

  const emailsByDomainId = emails.reduce(
    (acc, email) => {
      const domainId = Number(email.domain.href.split("/").at(-2));
      if (!acc[domainId]) acc[domainId] = [];
      acc[domainId].push(email);
      return acc;
    },
    {} as Record<number, Mailbox[]>,
  );

  return (
    <List isLoading={isLoading}>
      {domains.map((domain) => (
        <List.Section key={domain.id} title={domain.name}>
          {(emailsByDomainId[domain.id] || []).map((email) => (
            <List.Item
              key={email.id}
              icon={Icon.AtSymbol}
              title={email.name}
              subtitle={email.annotation}
              actions={
                <ActionPanel>
                  <OpenInAlwaysdata path={`mailbox/${email.id}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
