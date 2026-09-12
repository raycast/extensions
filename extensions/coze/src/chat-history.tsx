import useAPI from "./hooks/useAPI";
import BotConversationView from "./views/BotConversationView";

export default function CommandChatHistoryView() {
  const { isLoading, api } = useAPI();
  return <BotConversationView isLoading={isLoading} api={api} />;
}
