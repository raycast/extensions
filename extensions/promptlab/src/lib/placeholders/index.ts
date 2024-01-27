import PromptPlaceholder from "./custom-placeholders/directives/prompt";
import CommandsPlaceholder from "./custom-placeholders/commands";
import ImageAnimalsPlaceholder from "./custom-placeholders/imageAnimals";
import ImageBarcodesPlaceholder from "./custom-placeholders/imageBarcodes";
import ImageFacesPlaceholder from "./custom-placeholders/imageFaces";
import ImageHorizonPlaceholder from "./custom-placeholders/imageHorizon";
import ImagePOIPlaceholder from "./custom-placeholders/imagePOI";
import ImageRectanglesPlaceholder from "./custom-placeholders/imageRectangles";
import ImageSubjectsPlaceholder from "./custom-placeholders/imageSubjects";
import ImageTextPlaceholder from "./custom-placeholders/imageText";
import InputPlaceholder from "./custom-placeholders/input";
import PDFOCRTextPlaceholder from "./custom-placeholders/pdfOCRText";
import PDFRawTextPlaceholder from "./custom-placeholders/pdfRawText";
import PreviousCommandPlaceholder from "./custom-placeholders/previousCommand";
import PreviousPromptPlaceholder from "./custom-placeholders/previousPrompt";
import PreviousResponsePlaceholder from "./custom-placeholders/previousResponse";
import ScreenContentPlaceholder from "./custom-placeholders/screenContent";
import WindowContentPlaceholder from "./custom-placeholders/windowContent";
import FileContentsPlaceholder from "./custom-placeholders/contents";
import { DefaultPlaceholders, PlaceholderType } from "placeholders-toolkit";
import LastRunPLaceholder from "./custom-placeholders/lastRun";

export const PromptLabPlaceholders = [
  FileContentsPlaceholder,
  CommandsPlaceholder,
  ImageAnimalsPlaceholder,
  ImageBarcodesPlaceholder,
  ImageFacesPlaceholder,
  ImageHorizonPlaceholder,
  ImagePOIPlaceholder,
  ImageRectanglesPlaceholder,
  ImageSubjectsPlaceholder,
  ImageTextPlaceholder,
  InputPlaceholder,
  PDFOCRTextPlaceholder,
  PDFRawTextPlaceholder,
  PreviousCommandPlaceholder,
  PreviousPromptPlaceholder,
  PreviousResponsePlaceholder,
  LastRunPLaceholder,
  ScreenContentPlaceholder,
  WindowContentPlaceholder,
  ...Object.values(DefaultPlaceholders).filter((placeholder) => placeholder.type != PlaceholderType.Script),
  PromptPlaceholder,
  ...Object.values(DefaultPlaceholders).filter((placeholder) => placeholder.type == PlaceholderType.Script),
];

export { loadCustomPlaceholders } from "./utils";
