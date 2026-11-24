import { LaunchProps } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { tinyfish } from "./auth";
import { FetchPagesForm } from "./components/fetch-pages-form";

function Command(props: LaunchProps<{ arguments: Arguments.FetchPages }>) {
  return <FetchPagesForm initialURL={props.arguments.url} />;
}

export default withAccessToken(tinyfish)(Command);
