import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Icon, LaunchProps, LaunchType, List, LocalStorage, launchCommand } from "@raycast/api";
import TempMail from "temp-mail-plus-api";
import { MailResponse } from "temp-mail-plus-api/dist/src/types";
import TurndownService from "turndown";
import { showFailureToast } from "@raycast/utils";

const turndownService = new TurndownService();

interface MailItem {
  mail_id: number;
  subject: string;
  from_mail: string;
}

export default function Command({ arguments: args }: LaunchProps<{ arguments: { address?: string } }>) {
  const [mailList, setMailList] = useState<MailItem[]>([]);
  const [mailDetails, setMailDetails] = useState<Record<number, MailResponse & { markdown: string }>>({});
  const [mailboxResults, setMailboxResults] = useState<MailItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mailAddress, setMailAddress] = useState<string | null>(null);
  const tempMailInstanceRef = useRef<TempMail | null>(null);
  const currentAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const normalizedSearch = searchText.toLowerCase();
    setMailboxResults(mailList.filter((item) => item.subject.toLowerCase().includes(normalizedSearch)));
  }, [searchText, mailList]);

  const didEmailsFetched = useRef(false);

  const getCurrentMailAddress = async () => {
    const address = args.address || (await LocalStorage.getItem<string>("mail_address"));
    setMailAddress(address ?? null);
    return address;
  };

  const getTempMailInstance = (address: string) => {
    if (!tempMailInstanceRef.current || currentAddressRef.current !== address) {
      tempMailInstanceRef.current = new TempMail(address);
      currentAddressRef.current = address;
    }
    return tempMailInstanceRef.current;
  };

  const fetchMails = async (address: string) => {
    try {
      const tempMailInstance = getTempMailInstance(address);
      const mails = (await tempMailInstance.fetchInbox()).mail_list || [];
      return mails;
    } catch {
      await showFailureToast("Failed to fetch mails");
      return [];
    }
  };

  const fetchMailDetails = async (mails: MailItem[], address: string) => {
    try {
      const tempMailInstance = getTempMailInstance(address);
      const detailEntries = await Promise.all(
        mails.map(async (mail) => {
          try {
            const details = await tempMailInstance.fetchMailById(mail.mail_id);
            if (!details) return null;

            const preparedMarkdown = turndownService.turndown(details.html ?? "");
            return {
              [mail.mail_id]: {
                ...details,
                markdown: `# ${details.subject}\n\n**From:** ${details.from_mail}\n\n**Date:** ${details.date}\n\n${preparedMarkdown}`,
              },
            } as Record<number, MailResponse & { markdown: string }>;
          } catch {
            return null;
          }
        }),
      );

      const mergedDetails = detailEntries
        .filter((entry): entry is Record<number, MailResponse & { markdown: string }> => Boolean(entry))
        .reduce(
          (acc, entry) => ({
            ...acc,
            ...entry,
          }),
          {} as Record<number, MailResponse & { markdown: string }>,
        );

      if (Object.keys(mergedDetails).length > 0) {
        setMailDetails((prev) => ({ ...prev, ...mergedDetails }));
      }
    } catch {
      await showFailureToast("Failed to fetch mail details");
    }
  };

  useEffect(() => {
    if (didEmailsFetched.current) return;

    const loadInbox = async () => {
      setIsLoading(true);
      const currentAddress = await getCurrentMailAddress();
      if (!currentAddress) {
        setMailList([]);
        setMailboxResults([]);
        setIsLoading(false);
        didEmailsFetched.current = true;
        return;
      }

      const mails = await fetchMails(currentAddress);
      setMailList(mails);
      setMailboxResults(mails);
      didEmailsFetched.current = true;
      setIsLoading(false);
      fetchMailDetails(mails, currentAddress);
    };

    loadInbox();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail filtering={false} onSearchTextChange={setSearchText}>
      {!mailAddress && !isLoading ? (
        <List.EmptyView
          icon={Icon.Envelope}
          title="No active email address"
          description="Set a temporary email address to see its inbox."
          actions={
            <ActionPanel>
              <Action
                title="Set New Temp Mail Address"
                icon="💌"
                onAction={async () => {
                  try {
                    await launchCommand({ name: "set-new-temp-mail-address", type: LaunchType.UserInitiated });
                  } catch (error) {
                    await showFailureToast(error, { title: "Unable to open command" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ) : mailList.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Envelope}
          title="No messages yet"
          description={`Inbox for ${mailAddress} is empty.`}
        />
      ) : mailboxResults.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No results" description="No messages match your search." />
      ) : (
        mailboxResults.map((mail: MailItem) => (
          <List.Item
            key={mail.mail_id}
            title={mail.subject}
            subtitle={mail.from_mail}
            detail={<List.Item.Detail markdown={mailDetails[mail.mail_id]?.markdown ?? "Loading..."} />}
          />
        ))
      )}
    </List>
  );
}
