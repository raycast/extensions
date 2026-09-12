import { getPreferenceValues } from "@raycast/api";
import removeBg from "./operations/removeBgOperation";
import runOperation from "./operations/runOperation";
import { Colors } from "./utilities/types";
import { getSelectedImages, showErrorToast } from "./utilities/utils";

export default async function RemoveBgCommand(props: { arguments: { bgcolor: string; crop: string } }) {
  const { bgcolor, crop } = props.arguments;
  const preferences = getPreferenceValues<Preferences.RemoveBg>();

  const color = bgcolor || preferences.defaultBgColor;
  if (
    color?.length > 0 &&
    !color.match(/^#?[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/) &&
    !Object.keys(Colors).includes(color.toLowerCase().replaceAll(" ", ""))
  ) {
    await showErrorToast(
      "Invalid color string provided.",
      new Error(
        `'${color}' is not a valid color string. Please provide a valid hex color (e.g. #FF0000FF) or named HTML color (e.g. Red).`,
      ),
    );
    return;
  }

  const cropToSubject = crop === "yes" || (crop !== "no" && preferences.cropByDefault);

  const selectedImages = await getSelectedImages();
  const pluralized = selectedImages.length > 1 ? "backgrounds" : "background";
  await runOperation({
    operation: () => removeBg(selectedImages, color || undefined, cropToSubject),
    selectedImages,
    inProgressMessage: `Removing ${pluralized}...`,
    successMessage: `Removed ${pluralized} from`,
    failureMessage: `Failed to remove ${pluralized} from`,
  });
}
