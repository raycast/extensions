import { getAccessToken, withAccessToken } from "@raycast/utils";
import { provider } from "./oauth";

export default withAccessToken(provider)(Index);

function Index() {
    const { token } = getAccessToken();
    console.log(token)
}
