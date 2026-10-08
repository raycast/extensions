export class CWTextNode {
  parent: CWTextNode | undefined;
  protected static cnter = 0;
  protected _id: number;
  public get id(): number {
    return this._id;
  }
  protected _fstChild: CWTextNode | undefined;
  public get fstChild(): CWTextNode | undefined {
    return this._fstChild;
  }
  public set fstChild(value: CWTextNode | undefined) {
    this._fstChild = value;
  }
  protected _next: CWTextNode | undefined;
  public get next(): CWTextNode | undefined {
    return this._next;
  }
  public set next(value: CWTextNode | undefined) {
    this._next = value;
  }
  protected _txt: string;
  public get txt(): string {
    return this._txt;
  }
  public set txt(value: string) {
    this._txt = value;
  }
  constructor(parent: CWTextNode | undefined, txt: string) {
    CWTextNode.cnter++;
    this._id = CWTextNode.cnter;
    this.parent = parent;
    if (parent !== undefined) {
      if (parent.fstChild === undefined) {
        parent.fstChild = this;
      } else {
        if (parent.fstChild.next === undefined) {
          parent.fstChild.next = this;
        } else {
          let next = parent.fstChild.next;
          while (next.next !== undefined) {
            next = next.next;
          }
          next.next = this;
        }
      }
    }
    this._txt = txt;
  }
  public mergeChildNode(text: string) {
    return text;
  }
}
