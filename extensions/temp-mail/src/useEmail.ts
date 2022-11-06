import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import {
  createOneAccount,
  deleteAccount,
  deleteMessage,
  getMessage,
  getMessages,
  login,
  loginWithToken,
  setMessageSeen,
  subscribeToMailbox,
} from "./mail-api";

export type Message = {
  id: string;
  email: string;
  name: string;
  subject: string;
  date: string;
  intro: string;
  seen: boolean;
  body?: string;
};

type User = {
  id: string;
  username: string;
  password: string;
  token: string;
};

const loginOrCreateUser = async (user: User) => {
  if (!user || !user.username || !user.password || !user.token) {
    const res = await createOneAccount();
    return res.data as User;
  } else {
    try {
      const res = await loginWithToken(user.token);
      if (res.status) return user;
      else {
        const res = await login(user.username, user.password);
        if (res.status) return { ...user, token: res.data.token };
        else throw new Error(`Login failed: ${res.message}`);
      }
    } catch (error) {
      const res = await createOneAccount();
      return res.data as User;
    }
  }
};

const fetchInbox = async (token: string) => {
  const { data } = await getMessages(token);

  if (data.length > 0) {
    const inbox: Message[] = data.map(({ id, from, subject, intro, createdAt, seen }) => ({
      email: from.address,
      name: from.name,
      date: createdAt,
      id,
      subject,
      intro,
      seen,
    }));

    return inbox;
  }
  return [];
};

const useEmail = () => {
  const [user, setUser] = useCachedState<User>("user");
  const [inbox, setInbox] = useState<Message[]>([]);
  const [cachedMsgs, setCachedMsgs] = useState<object>({});
  const [unsubscribe, setUnsubscribe] = useState<() => void>();

  const handleUser = async (currUser: User) => {
    const newUser = await loginOrCreateUser(currUser);
    setUser(newUser);
    const newInbox = await fetchInbox(newUser.token);
    setInbox(newInbox);

    unsubscribe && unsubscribe();

    const dispose = subscribeToMailbox(newUser.id, newUser.token, async () => {
      const newInbox = await fetchInbox(newUser.token);
      setInbox(newInbox);
    });

    setUnsubscribe(() => dispose);
  };

  const removeMessage = async (messageId: string) => {
    await deleteMessage(messageId, user.token);
    setInbox((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const markAsUnread = async (messageId: string, seen = true) => {
    await setMessageSeen(messageId, user.token, seen);
    setInbox((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, seen } : msg)));
  };

  useEffect(() => {
    void handleUser(user);

    return () => unsubscribe && unsubscribe();
  }, []);

  const disposeEmail = async () => {
    await deleteAccount(user.id, user.token);
    setUser(null);
    await handleUser(null);
  };

  const getMessageBody = async (id: string) => {
    let body = cachedMsgs[id];

    if (!body) {
      body = (await getMessage(id, user.token))?.data?.html[0];
      setCachedMsgs({ ...cachedMsgs, [id]: body });
    }

    if (!inbox.find((msg) => msg.id === id)?.seen) {
      await markAsUnread(id, true);
    }

    return body;
  };

  return {
    email: user?.username,
    inbox,
    getMessageBody,
    disposeEmail,
    markAsUnread,
    deleteMessage: removeMessage,
  };
};

export default useEmail;
