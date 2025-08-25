import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BabyBuddyAPI } from "../api";
import { findChildByName } from "../utils/api-helpers";
import { formatDiaperDataFromContents } from "../utils/form-helpers";
import { formatErrorMessage } from "../utils/formatters";
import { formatTimeToISO, getContentsDescription, normalizeContents } from "../utils/normalizers";

/**
 * Create a new diaper change entry for a child
 *
 * If asked to create a diaper change with 2 different amount values,
 * create multiple diapers. E.g. "log a wet 1 and solid 2" should create
 * 2 diaper changes. If there's two different types selected (wet and solid) but
 * they have the same value, they can both be selected in the same diaper entry.
 *
 * @param childName - The name of the child
 * @param contents - Contents of the diaper (wet, solid, both)
 * @param color - Color of the diaper contents
 * @param amount - Amount description
 * @param notes - Any notes about the diaper change
 * @param time - The time of the diaper change (ISO string). If not provided, current time will be used.
 */
export default async function ({
  childName,
  contents,
  color = "",
  amount = "",
  notes = "",
  time,
}: {
  childName: string;
  contents: string;
  color?: string;
  amount?: string;
  notes?: string;
  time?: string;
}) {
  const api = new BabyBuddyAPI();
  const children = await api.getChildren();

  // Find child using the utility function
  const child = findChildByName(children, childName);

  if (!child) {
    throw new Error(`Child with name ${childName} not found`);
  }

  // Format time to ISO using utility function
  const formattedTime = formatTimeToISO(time) || new Date().toISOString();

  // Normalize contents using utility function
  const normalizedContents = normalizeContents(contents);

  // Format and prepare the data using utility function
  const diaperData = {
    ...formatDiaperDataFromContents({
      childId: child.id,
      time: formattedTime,
      contents,
      color,
      amount,
      notes,
    }),
  };

  try {
    const newDiaper = await api.createDiaper(diaperData);

    await showToast({
      style: Toast.Style.Success,
      title: "Diaper Change Created",
      message: `Recorded ${getContentsDescription(normalizedContents)} diaper for ${child.first_name}`,
    });

    return newDiaper;
  } catch (error) {
    await showFailureToast({
      title: "Error Creating Diaper Change",
      message: formatErrorMessage(error),
    });
  }
}
