import { Detail, LaunchProps } from "@raycast/api";
import { useContext, useEffect, useState } from "react";
import { getSession } from "./utils/tgClient";
import { Api, TelegramClient } from "telegram";
import LoginForm from "./views/loginForm";
import { SessionContext } from "./contexts/sessionContext";
import { ClientContext } from "./contexts/clientContext";
import util from "util";

interface quickMsgArguments {
  contact: string;
  message: string;
}
interface Contact {
  username: string;
  firstName?: string;
  lastName?: string;
}
function App(props: quickMsgArguments) {
  const { session } = useContext(SessionContext);
  const { globalClient } = useContext(ClientContext);
  const [sentTo, setSentTo] = useState<Contact | undefined>(undefined);

  useEffect(() => {
    (async () => {
      if (globalClient === undefined) {
        console.log("Client is undefined");
        return;
      }
      console.log("Connecting client after fetching a new one");
      await globalClient.connect();
      try {
        const result: Api.contacts.Found = await globalClient.invoke(
          new Api.contacts.Search({
            q: props.contact,
            limit: 3,
          })
        );
        const users: Api.User[] = (result.users as Api.User[]).filter(
          (user) => user.bot === false && user.contact == true && user.username != null
        );
        // console.log(
        //   util.inspect(users, {
        //     showHidden: false,
        //     depth: null,
        //   })
        // );
        if (users.length === 0) {
          return;
        }
        const username = users[0].username;
        if (username) {
          await globalClient.sendMessage(username, { message: props.message });
          setSentTo({ username: username, firstName: users[0].firstName, lastName: users[0].lastName });
        }
      } catch (e) {
        console.log("Error sending message: ", e);
      }
    })();
    return () => {
      if (globalClient) {
        console.log("Disconnecting client if it exists");
      }
      globalClient?.disconnect();
    };
  }, [globalClient]);

  return globalClient === undefined || session == "" ? (
    <LoginForm />
  ) : sentTo ? (
    <Detail
      markdown={
        sentTo
          ? `Sent: *${props.message}* to **${sentTo?.firstName || ""} ${sentTo?.lastName || ""}(${sentTo?.username})**`
          : `Couldn't find any user in your contact list with **${props.contact}** name`
      }
    />
  ) : (
    <Detail isLoading />
  );
}
export default function QuickMsg(props: LaunchProps<{ arguments: quickMsgArguments }>) {
  const [session, setSession] = useState<string>("");
  const [globalClient, setGlobalClient] = useState<TelegramClient | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  useEffect(() => {
    (async () => {
      try {
        const sessionValue = await getSession();
        setSession(sessionValue);
      } catch (error) {
        console.error("Error getting session: ", error);
        // You can set an error state here to show the error message on the UI
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return <Detail isLoading />;
  }

  // TODO: user doesn't have to return back to send message, after login form we should consider the props arguments and send the message
  return (
    <SessionContext.Provider
      value={{
        session,
        setSession: (value) => {
          setSession(value);
          // if (!value) {
          //   logout();
          // }
        },
      }}
    >
      <ClientContext.Provider
        value={{
          globalClient,
          setGlobalClient: (value) => {
            setGlobalClient(value);
          },
        }}
      >
        <App contact={props.arguments.contact.trim()} message={props.arguments.message.trim()} />
      </ClientContext.Provider>
    </SessionContext.Provider>
  );
}
