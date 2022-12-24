import { CWTextNode } from "./CWTextNode";
export class CWTextNodeSurrounded extends CWTextNode {
  protected _openTag: string;
  public get openTag(): string {
    return this._openTag;
  }
  public set openTag(value: string) {
    this._openTag = value;
  }
  protected _closeTag: string;
  public get closeTag(): string {
    return this._closeTag;
  }
  public set closeTag(value: string) {
    this._closeTag = value;
  }
  constructor(parent: CWTextNode, txt: string) {
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
      return `>${text}\n`;
    } else {
      return text;
    }
  }
}
