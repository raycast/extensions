import { withAccessToken } from "@raycast/utils";

import { CreateDataBasePageForm } from "./components/forms/CreatePageForm";
import { notionService } from "./utils/notion/oauth";

export default withAccessToken(notionService)(CreateDataBasePageForm);
