import { withAccessToken } from "@raycast/utils";

import { CreatePageForm } from "./components/forms/CreatePageForm";
import { notionService } from "./utils/notion/oauth";

export default withAccessToken(notionService)(CreatePageForm);
