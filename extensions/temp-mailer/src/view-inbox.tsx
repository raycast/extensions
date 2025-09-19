import { useEffect, useRef, useState } from "react";
import { List, LocalStorage } from "@raycast/api";
import TempMail from "temp-mail-plus-api";
import { MailResponse } from "temp-mail-plus-api/dist/src/types";
import TurndownService from "turndown";

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
  const turndownService = new TurndownService();

  useEffect(() => {
    setMailboxResults(mailList.filter((item) => item.subject.includes(searchText)));
  }, [searchText, mailList]);

  const didEmailsFetched = useRef(false);

  const getCurrentMailAddress = async () => {
    const mailAddress = await LocalStorage.getItem<string>("mail_address");
    return mailAddress;
  };

  const fetchMails = async () => {
    const mailAddress = await getCurrentMailAddress();
    if (!mailAddress) return [];
    const tempMailInstance = new TempMail(mailAddress);
    const mails = (await tempMailInstance.fetchInbox()).mail_list || [];
    return mails;
  };

  const fetchMailInformation = async (mailId: number) => {
    const mailAddress = await getCurrentMailAddress();
    if (!mailAddress) return;

    const tempMailInstance = new TempMail(mailAddress);

    const mailInfo = await tempMailInstance.fetchMailById(mailId);
    return mailInfo;
  };

  const fetchMailDetails = async (mails: MailItem[]) => {
    for (const mail of mails) {
      const allMailDetails: Record<string, Partial<MailResponse> & { markdown: string }> = {};
      const details = await fetchMailInformation(mail?.mail_id);
      if (details) {
        const preparedMarkdown = turndownService.turndown(details.html as string);
        allMailDetails[mail.mail_id] = {
          ...details,
          markdown: `# ${details.subject}\n\n**From:** ${details.from_mail}\n\n**Date:** ${details.date}\n\n${preparedMarkdown}`,
        };
      }
      setMailDetails((prevDetails) => ({ ...prevDetails, ...allMailDetails }));
    }
  };

  fetchMails().then((mails: MailItem[]) => {
    if (didEmailsFetched.current) return;
    setMailList(mails);
    setMailboxResults(mails);
    didEmailsFetched.current = true;
    fetchMailDetails(mails);
  });

  return (
    <List isShowingDetail filtering={false} onSearchTextChange={setSearchText}>
      {mailboxResults.map((mail: MailItem) => (
        <List.Item
          key={mail.mail_id}
          title={mail.subject}
          subtitle={mail.from_mail}
          detail={<List.Item.Detail markdown={mailDetails[mail.mail_id]?.markdown ?? "Loading..."} />}
        />
      ))}
    </List>
  );
}
