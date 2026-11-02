import { withAccessToken } from "@raycast/utils";
import ChatsView from "./components/ChatsView";
import { oauthService } from "./utils/oauth";

const Chats = () => <ChatsView />;

export default withAccessToken(oauthService)(Chats);
