import { copyTextToClipboard, showHUD } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
interface UUIDArguments {
  numberOfUUIDsToGenerate: string;
}

// don't want to cause a heap error, so cap it 😱
const UUID_MAX_NUMBER = 10000;

export default async (props: { arguments: UUIDArguments }) => {
  let { numberOfUUIDsToGenerate } = props.arguments;

  if (!numberOfUUIDsToGenerate) {
    numberOfUUIDsToGenerate = "1";
  }

  try {
    const parseableNumber = parseInt(numberOfUUIDsToGenerate, 10);

    if (isNaN(parseableNumber)) {
      throw new Error("INVALID_NUMBER");
    }

    // safe?
    if (parseableNumber <= UUID_MAX_NUMBER) {
      const uuids = Array.from(Array(parseableNumber)).map(() => uuidv4());
      const successMessage = uuids.length > 1 ? `Copied ${uuids.length} new UUIDs.` : `Copied new UUID: ${uuids}`;
      await copyTextToClipboard(uuids.join("\r\n"));
      await showHUD(`✅ ${successMessage}`);
    } else {
      await showHUD(`❌ ${parseableNumber} exceeds maximum UUIDs of ${UUID_MAX_NUMBER}. Try a lower number.`);
    }
  } catch (e) {
    await showHUD(`❌ Invalid number provided. Try an actual number.`);
  }
};
