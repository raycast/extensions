import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The name of the section
   */
  name: string;
  /**
   * The project to add the section to
   */
  project_id: string;
  /**
   * The order of the section in the project (smaller number = earlier in the project)
   */
  section_order?: number;
};

export default withTodoistApi(async function (input: Input) {
  const temp_id = crypto.randomUUID();

  return syncRequest({
    sync_token,
    resource_types: ["sections"],
    commands: [
      {
        type: "section_add",
        temp_id,
        uuid: crypto.randomUUID(),
        args: input,
      },
    ],
  });
});
