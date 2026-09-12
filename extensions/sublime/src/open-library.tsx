import { open } from "@raycast/api";
import { webUrl } from "./utils/constants";
import { withAccessToken } from "@raycast/utils";
import { authService } from "./utils/auth";

async function OpenLibrary() {
    open(`${webUrl}/library`);
}

export default withAccessToken(authService)(OpenLibrary);
