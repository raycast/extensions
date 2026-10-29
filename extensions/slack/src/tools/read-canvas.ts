import { getCanvasWebClient } from "../shared/client/WebClient";
import { readCanvas, parseCanvasSectionTypes } from "../shared/client/canvas";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /** Existing canvas URL (https://workspace.slack.com/docs/T…/F…) or F-prefixed canvas ID. */
  canvas: string;
  /** Find sections containing this text. Use specific text to identify an edit target; lookup returns IDs without section bodies. */
  containsText?: string;
  /** Up to three optional Slack section type filters, separated by commas or newlines: any_header, h1, h2, h3, table, list, blockquote, callout, flexbox, horizontal_line, chart, citation, canvas_unfurl, file_unfurl, message_unfurl, user_mention, user_unfurl, sfdc_record_mention or sfdc_record_unfurl. Without lookup fields, returns heading IDs. */
  sectionTypes?: string;
};

async function tool(input: Input): Promise<{
  canvasId: string;
  markdown: string;
  html: string;
  snapshot: string;
  sections: { id: string }[];
  lookupCriteria: { contains_text?: string; section_types?: string[] };
  limitations: string;
}> {
  return readCanvas(getCanvasWebClient(), { ...input, sectionTypes: parseCanvasSectionTypes(input.sectionTypes) });
}

export default withSlackClient(tool);
