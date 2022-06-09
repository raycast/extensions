import { Icon, List, getPreferenceValues, ActionPanel, Action, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import path from "path";
import { homedir } from "node:os";
import fs from "fs/promises";
import { constants } from "fs";
import { execSync } from "child_process";

interface Messages {
  ROWID: number;
  sender: string;
  service: string;
  message_date: string;
  text: string;
}

interface Error {
  type: string;
  title: string;
  description: string;
}

interface Codes {
  rowid: number;
  date: string;
  code: number | string;
  sender: string;
  message: string;
}

export default function Command() {
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState<boolean>(true);
  const [Codes, setCodes] = useState<Codes[]>([]);

  // Get the preference value
  const { minutes } = getPreferenceValues();

  // change type to number
  const minutesNumber = Number(minutes);

  // ChatDB Path
  const ChatDB = path.join(homedir(), "./Library/Messages/chat.db");

  // check if Database is accessible
  const isAccessible = async (): Promise<boolean> => {
    try {
      await fs.access(ChatDB, constants.F_OK | constants.R_OK);
      return true;
    } catch (e) {
      return false;
    }
  };

  // get all messages
  const getMessages = async (): Promise<Messages[]> => {
    try {
      // exucute sqlite3 command
      const stdout = execSync(`sqlite3 -json ${ChatDB} < ${path.join(__dirname, "./assets/messages.sql")}`);

      // Parse JSON
      const messages = JSON.parse(Buffer.from(stdout).toString());

      // return messages
      return messages;
    } catch (error) {
      setError({
        type: "error",
        title: "Error",
        description: "Could not get messages",
      });
      return [];
    }
  };

  const getMessagesByXMinutes = async (messages: Messages[], minutes: number): Promise<Messages[]> => {
    return messages.filter((message) => {
      const date = new Date(message.message_date);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      return diff / 60000 <= minutes;
    });
  };

  const get2FACode = (messages: Messages[]) => {
    // list of regexs to match
    const regexs = {
      // Set 1 Return index 2
      Set1: {
        index: 2,
        regex: [
          /(^|\s|R|\t|\b|G-|:)(\d{5,8})($|\s|R|\t|\b|\.|,)/,
          /(code:|is:)\s*(\d{4,8})($|\s|R|\t|\b|\.|,)/i,
          /(code|is):?\s*(\d{3,8})($|\s|R|\t|\b|\.|,)/i,
        ],
      },
      // Set 2 Return index 1
      Set2: {
        index: 1,
        regex: /^(\d{4,8})(\sis your.*code)/,
      },
      //  Set 3 Return index 2 and 3
      Set3: {
        regex: /(^|code:|is:|\b)\s*(\d{3})-(\d{3})($|\s|R|\t|\b|\.|,)/,
      },
    };

    const matches = messages.reduce((acc: any, message) => {
      const match = regexs.Set1.regex.reduce((acc, regex) => {
        const match = regex.exec(message.text);
        if (match) {
          return match[regexs.Set1.index];
        } else {
          const match = regexs.Set2.regex.exec(message.text);
          if (match) {
            return match[regexs.Set2.index];
          } else {
            const match = regexs.Set3.regex.exec(message.text);
            if (match) {
              return match[2] + match[3];
            }
          }
        }
        return acc;
      }, "");
      if (match) {
        return [
          ...acc,
          {
            date: message.message_date,
            code: match,
            sender: message.sender,
            message: message.text,
            rowid: message.ROWID,
          },
        ];
      }
      return acc;
    }, [] as string[]);

    return matches;
  };

  useEffect(() => {
    async function run() {
      // if Chat Database is not accessible then set Error
      if (!(await isAccessible())) {
        setError({
          type: "unauthorized",
          title: "Can't access Messages",
          description: `
          You need to give Full-Disk access to raycast!
          Go to System Preferences > Security & Privacy > Privacy > Full Disk Access
          `,
        });
        return;
      }

      // get all messages
      const messages = await getMessages();

      // Reduce messages to only the last X minutes
      const messagesByMinutes = await getMessagesByXMinutes(messages, minutesNumber);

      // if there are no messages then set Error
      if (messagesByMinutes.length === 0) {
        setError({
          type: "no-messages",
          title: "No Messages Found",
          description: "You have no 2FA messages in the last " + minutes + " minutes",
        });
        return;
      }

      // get 2FA Code
      const codes = get2FACode(messagesByMinutes);

      // if no 2FA code found then set Error
      if (!codes) {
        setError({
          type: "no-code",
          title: "No 2FA Code Found",
          description: "No 2FA code found in the last " + minutes + " minutes",
        });
        return;
      }

      // set Codes
      setCodes(codes);

      setLoading(false);
    }

    run();
  }, []);

  // set the icon
  const setIcon = (type: string) => {
    switch (type) {
      case "unauthorized":
        return Icon.Hammer;
      case "no-messages":
        return Icon.MagnifyingGlass;
      case "no-code":
        return Icon.ExclamationMark;
      case "loading":
        return Icon.Eye;
    }
  };

  if (error)
    return (
      <List navigationTitle={error.title}>
        <List.EmptyView icon={setIcon(error.type)} title={error.title} description={error.description} />
      </List>
    );

  if (loading)
    return (
      <List navigationTitle="Loading...">
        <List.EmptyView icon={setIcon("loading")} title="Loading..." description="Please wait..." />
      </List>
    );

  return (
    <List navigationTitle="2FA Codes">
      {Codes.map((code) => (
        <List.Item
          key={code.rowid}
          title={code.sender}
          subtitle={code.message}
          accessories={[
            {
              icon: Icon.Person,
              text: new Date(code.date).toLocaleString(),
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Paste content={code.code.toString()} onPaste={() => showHUD("Copied To Clipboard")} />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
