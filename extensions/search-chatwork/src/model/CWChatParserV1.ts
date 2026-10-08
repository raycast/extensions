import { ICWChatParser } from "./ICWChatParser";
import { CWTextNode } from "./CWTextNode";
import { CWTextNodeFactory } from "./CWTextNodeFactory";
import { PARSER_STATE } from "./enumParser";

/**
 * this class is to parse raw test provided by CW.
 *
 * it is supposed for this class to be used in DI way.
 */
export class CWChatParserV1 implements ICWChatParser {
  private readonly notSupported = ["[dtext"];
  private readonly _RegExpLeft = /([^[]+?(?=\[))|^(?!.*\[).+$/gs;
  private readonly _RegExpOpen = /\[(info|code|title|qt)\]/gm;
  private readonly _RegExpSelfClosed = /\[[^/]*?\]/gm;
  private readonly _RegExpClose = /\[\/.+?\]/gm;
  private readonly _RegExpOnlyLineFeed = /\n{1,}/gm;
  private cWTextNodeFactory: CWTextNodeFactory = new CWTextNodeFactory();
  parseText(rawText: string): string {
    // to mod break-line
    // rawText = "test1\ntest2\n\ntest3\n\n\ntest4".replace(this._RegExpOnlyLineFeed,"\n\n")
    rawText = rawText.replace(this._RegExpOnlyLineFeed, "\n\n");
    if (this.isNotsurpported(rawText, this.notSupported)) {
      return "";
    }

    const root = new CWTextNode(undefined, "");
    let state = this.checkState(rawText);
    let leftToBeParsed = rawText;
    let currNode: CWTextNode | undefined = root;
    while (state !== PARSER_STATE.END) {
      const re = this.getReGex(state);
      const ret = this.getToken(leftToBeParsed, re);
      leftToBeParsed = ret.tkn.trimed;
      currNode = this.cWTextNodeFactory.createCwText(ret.tkn.val, currNode, state);
      state = this.checkState(leftToBeParsed);
    }
    const parsedText = this.mergeNodes(root);
    return parsedText;
  }
  checkState(param: string) {
    const selfClosedTag =
      param.search(this._RegExpSelfClosed) == -1 ? Number.MAX_VALUE : param.search(this._RegExpSelfClosed);
    const openTag = param.search(this._RegExpOpen) == -1 ? Number.MAX_VALUE : param.search(this._RegExpOpen);
    const closeTag = param.search(this._RegExpClose) == -1 ? Number.MAX_VALUE : param.search(this._RegExpClose);
    const left = param.search(this._RegExpLeft) == -1 ? Number.MAX_VALUE : param.search(this._RegExpLeft);

    if (openTag <= selfClosedTag && selfClosedTag < closeTag && selfClosedTag < left) {
      return PARSER_STATE.OPEN;
    } else if (selfClosedTag < closeTag && selfClosedTag < left) {
      return PARSER_STATE.SELF_CLOSED;
    } else if (closeTag < selfClosedTag && closeTag < left) {
      return PARSER_STATE.CLOSE;
    } else if (left < selfClosedTag && left < closeTag) {
      return PARSER_STATE.LEFT;
    } else {
      return PARSER_STATE.END;
    }
  }
  getReGex(state: PARSER_STATE) {
    switch (state) {
      case PARSER_STATE.SELF_CLOSED:
        return this._RegExpSelfClosed;
      case PARSER_STATE.LEFT:
        return this._RegExpLeft;
      case PARSER_STATE.OPEN:
        return this._RegExpOpen;
      case PARSER_STATE.CLOSE:
        return this._RegExpClose;
      default:
        return this._RegExpClose;
    }
  }
  getToken(params: string, regx: RegExp) {
    const ittr = params.matchAll(regx);
    const tkn = ittr.next().value;
    if (!(tkn ?? false)) {
      throw new Error(`cannot parse ${params}, ${regx}`);
    }
    return {
      tkn: {
        val: tkn[0],
        trimed: params.substring(tkn.index + tkn[0].length, params.length),
        length: tkn.length,
      },
    };
  }
  mergeNodes(node: CWTextNode, ret = ""): string {
    if (node.fstChild !== undefined) {
      ret += `${node.mergeChildNode(this.mergeNodes(node.fstChild))}`;
    }
    ret += node.txt;

    if (node.next !== undefined) {
      const nxt = this.getNextNode(node);
      if (nxt !== undefined) {
        ret += this.mergeNodes(nxt);
      }
    }

    return ret;
  }
  getNextNode(node: CWTextNode) {
    return node.next;
  }
  isNotsurpported(rawText = "", notSupporteds: string[]): boolean {
    for (const notSupported of notSupporteds) {
      if (rawText.includes(notSupported)) {
        return true;
      }
    }
    return false;
  }
}
