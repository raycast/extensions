import { showHUD, Clipboard } from "@raycast/api";
import { createId } from "@paralleldrive/cuid2";

interface Arguments {
  numberOfIdsToGenerate: string;
}

const MAX_IDS = 500;

export default async (props: { arguments: Arguments }) => {
  let { numberOfIdsToGenerate } = props.arguments;

  if (!numberOfIdsToGenerate) {
    numberOfIdsToGenerate = "1";
  }

  try {
    const idsToGenerate = parseInt(numberOfIdsToGenerate, 10);

    if (isNaN(idsToGenerate)) {
      throw new Error("INVALID_NUMBER");
    }

    // safe?
    if (idsToGenerate <= MAX_IDS) {
      const ids = Array.from(Array(idsToGenerate)).map(() => createId());

      const successMessage = ids.length > 1 ? `Copied ${ids.length} new Cuid2s.` : `Copied new Cuid2: ${ids}`;
      await Clipboard.copy(ids.join("\r\n"));
      await showHUD(`✅ ${successMessage}`);
    } else {
      await showHUD(`❌ ${idsToGenerate} exceeds maximum ids of ${MAX_IDS}. Try a lower number.`);
    }
  } catch (e) {
    await showHUD(`❌ Invalid number provided. Try an actual number.`);
  }
};
