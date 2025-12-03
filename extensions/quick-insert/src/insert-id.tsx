import { showHUD, Clipboard } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { nanoid } from "nanoid";
import { ulid } from "ulid";

interface Arguments {
  type: string;
}

export default async function InsertID(props: { arguments: Arguments }) {
  try {
    let id = "";

    switch (props.arguments.type) {
      case "uuid":
        id = randomUUID();
        break;
      case "ulid":
        id = ulid();
        break;
      case "nanoid":
        id = nanoid();
        break;
      case "nanoid-short":
        id = nanoid(10); // Shorter version
        break;
      default:
        id = randomUUID();
    }

    await Clipboard.paste(id);
    await showHUD(`✅ Inserted ${props.arguments.type.toUpperCase()}: ${id}`);
  } catch (error) {
    await showHUD(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
