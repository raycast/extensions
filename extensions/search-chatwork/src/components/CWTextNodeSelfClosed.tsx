import { CWTextNode } from "./CWTextNode";
export class CWTextNodeSelfClosed extends CWTextNode {
  private readonly supportedTags: string[] = ["hr", "To", "rp"];
  private readonly dicTagValue = { hr: "\n***\n", To: "Dear", rp: "Reply: " };

  constructor(parent: CWTextNode, txt: string) {
    super(parent, "");

    this.txt = this.mergeChildNode(txt);
  }
  public override mergeChildNode(text: string) {
    for (const tag of this.supportedTags) {
      if (text.includes(tag)) {
        return `${this.dicTagValue[tag]}`;
      }
    }
    // delete tag which isn't supported
    return ``;
  }
}
