import { withGoogleAuth } from "../components/withGoogleAuth";
import { createDocFromUrl, Prefix } from "../helpers/docs";

type Input = {
  /**
   * Type of document to create.
   *
   * Available options:
   * - `document`: Create a new Google Doc
   * - `spreadsheets`: Create a new Google Sheet
   * - `presentation`: Create a new Google Slides
   * - `forms`: Create a new Google Form
   *
   * Examples:
   * To create a new Google Doc titled "Meeting Notes":
   * {
   *   type: "document",
   *   title: "Meeting Notes"
   * }
   *
   * To create a new untitled spreadsheet:
   * {
   *   type: "spreadsheets"
   * }
   *
   * Note: The document will open in your default browser after creation.
   * The document will be created in your primary Google Drive account.
   */
  type: Prefix;

  /**
   * Optional title for the new document.
   * If not provided, Google will create an "Untitled" document.
   */
  title?: string;
};

export default withGoogleAuth(async function (input: Input) {
  await createDocFromUrl(input.type, input.title);
});
