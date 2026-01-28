import useAPI from "./hooks/useAPI";
import ChatFormView from "./views/ChatFormView";

export default function CommandBotChat() {
  const { isLoading, api } = useAPI();
  return <ChatFormView isLoading={isLoading} api={api} />;
}
