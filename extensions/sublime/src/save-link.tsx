import { withAccessToken } from "@raycast/utils";
import { authService } from "./utils/auth";
import getSaveCommand from "./views/save";

export default withAccessToken(authService)(getSaveCommand("Link"));
