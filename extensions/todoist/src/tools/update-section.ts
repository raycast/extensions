import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the section to update
   */
  id: string;
  /**
   * The new name for the section
   */
  name?: string;
  /**
   * Whether the section is collapsed
   */
  collapsed?: boolean;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["sections"],
    commands: [
      {
        type: "section_update",
        uuid: crypto.randomUUID(),
        args: input,
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id, name }: Input) => {
  const { sections } = await syncRequest({
    sync_token,
    resource_types: ["sections"],
  });

  const section = sections.find((s) => s.id === id);
  const info = [{ name: "Section", value: section?.name }];

  if (name) {
    info.push({ name: "New Name", value: name });
  }

  return { info };
});
