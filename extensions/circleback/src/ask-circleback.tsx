import { LaunchProps } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import ChatsView from "./components/ChatsView";
import { oauthService } from "./utils/oauth";

type Props = LaunchProps<{ arguments: Arguments.AskCircleback }>;

const AskCircleback = (props: Props) => <ChatsView initialQuestion={props.arguments.question} />;

export default withAccessToken(oauthService)(AskCircleback);
