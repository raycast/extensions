import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Icon, LaunchType, List, LocalStorage, launchCommand } from "@raycast/api";
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

export default function Command() {
  const [mailList, setMailList] = useState<MailItem[]>([]);
  const [mailDetails, setMailDetails] = useState<Record<number, MailResponse & { markdown: string }>>({});
  const [mailboxResults, setMailboxResults] = useState<MailItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mailAddress, setMailAddress] = useState<string | null>(null);

  useEffect(() => {
    const normalizedSearch = searchText.toLowerCase();
    setMailboxResults(mailList.filter((item) => item.subject.toLowerCase().includes(normalizedSearch)));
  }, [searchText, mailList]);

  const didEmailsFetched = useRef(false);

  const getCurrentMailAddress = async () => {
    const storedAddress = await LocalStorage.getItem<string>("mail_address");
    setMailAddress(storedAddress ?? null);
    return storedAddress;
  };

  const fetchMails = async (address: string) => {
    try {
      const tempMailInstance = new TempMail(address);
      const mails = (await tempMailInstance.fetchInbox()).mail_list || [];
      return mails;
    } catch {
      await showFailureToast("Failed to fetch mails");
      return [];
    }
  };

  const fetchMailDetails = async (mails: MailItem[], address: string) => {
    const detailEntries = await Promise.all(
      mails.map(async (mail) => {
        const tempMailInstance = new TempMail(address);
        const details = await tempMailInstance.fetchMailById(mail.mail_id);
        if (!details) return null;

        const preparedMarkdown = turndownService.turndown(details.html as string);
        return {
          [mail.mail_id]: {
            ...details,
            markdown: `# ${details.subject}\n\n**From:** ${details.from_mail}\n\n**Date:** ${details.date}\n\n${preparedMarkdown}`,
          },
        } as Record<number, MailResponse & { markdown: string }>;
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
