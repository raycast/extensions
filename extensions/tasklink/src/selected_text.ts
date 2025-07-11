import { getSelectedText, Clipboard } from "@raycast/api";
import { IssueIdFormat, IssueIdStyle } from "./preferences";

export async function getSelectedTextOfFrontmostApplication(): Promise<SelectedText> {
  return getSelectedText().then(SelectedText.from);
}

export class SelectedText {
  private constructor(private text: string) {}

  public static from(text: string): SelectedText {
    return new SelectedText(text);
  }

  public convertIssueIdsIntoHtmlLinks(issueIdStyle: IssueIdStyle, issueDetailsUrl: string): HtmlText {
    return new HtmlText(this.replace(issueIdStyle, `<a href="${issueDetailsUrl}">$&</a>`));
  }

  public convertIssueIdsIntoMarkdownLinks(issueIdStyle: IssueIdStyle, issueDetailsUrl: string): MarkdownText {
    return new MarkdownText(this.replace(issueIdStyle, `[$&](${issueDetailsUrl})`));
  }

  private replace(issueIdStyle: IssueIdStyle, replaceValue: string): string {
    const regexp = new RegExp(IssueIdFormat[issueIdStyle], "gm");
    return this.text.replace(regexp, replaceValue);
  }
}

export class HtmlText {
  constructor(private text: string) {}

  public toClipboardContent(): Clipboard.Content {
    return { html: this.text.replaceAll("\n", "<br />") };
  }
}

export class MarkdownText {
  constructor(private text: string) {}

  public toClipboardContent(): Clipboard.Content {
    return { text: this.text };
  }
}
