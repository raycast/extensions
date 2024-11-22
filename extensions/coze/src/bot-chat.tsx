import { useEffect, useRef, useState } from "react";
import ChatForm from "./views/chat_form";
import useAPI from "./net/api";

export default function CommandBotChat() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const api = useRef<Awaited<ReturnType<typeof useAPI>>>();

  useEffect(() => {
    (async () => {
      api.current = await useAPI();
      setIsLoading(false);
    })();
  }, []);

  return <ChatForm
    isLoading={isLoading}
    api={api?.current}
  />
}
