import { URLConstants } from "Const";

export const languageURL = (language: string) => {
  const imagesURL = `${URLConstants.baseRawURL}/images`;

  // This is a workaround and should be removed after the renaming of the
  // language icon got changed from icon-nodejs.png to icon-node.png in the
  // Script Commands repository
  if (language === "node") {
    language += "js";
  }

  return `${imagesURL}/icon-${language}.png`;
};
