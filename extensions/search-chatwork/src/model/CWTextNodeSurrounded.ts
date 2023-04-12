import { CWTextNode } from "./CWTextNode";
export class CWTextNodeSurrounded extends CWTextNode {
  protected _openTag = "";
  public get openTag(): string {
    return this._openTag;
  }
  public set openTag(value: string) {
    this._openTag = value;
  }
  protected _closeTag = "";
  public get closeTag(): string {
    return this._closeTag;
  }
  public set closeTag(value: string) {
    this._closeTag = value;
  }
  constructor(parent: CWTextNode | undefined, txt: string) {
    super(parent, txt);
  }
  public override mergeChildNode(text: string) {
    if (this.openTag === "[info]") {
      return `***\n${text}\n***`;
    } else if (this.openTag === "[code]") {
      return `\`\`\`\n${text}\n\`\`\``;
    } else if (this.openTag === "[title]") {
      return `**${text}**`;
    } else if (this.openTag === "[qt]") {
      return `> ${text} \n\n `;
    } else {
      return text;
    }
  }
}
