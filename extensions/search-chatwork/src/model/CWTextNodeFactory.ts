import { CWTextNodeSurrounded } from "./CWTextNodeSurrounded";
import { CWTextNode } from "./CWTextNode";
import { PARSER_STATE } from "./enumParser";
import { CWTextNodeSelfClosed } from "./CWTextNodeSelfClosed";
export class CWTextNodeFactory {
  /**
   * this factory produce CWText Instance that suits the pattern of raw_text
   *
   * @param raw_text
   * @returns
   */
  public createCwText(value: string, current: CWTextNode | undefined, state: PARSER_STATE): CWTextNode | undefined {
    let child;
    console.log(`${state} ${value}`);
    switch (state) {
      case PARSER_STATE.SELF_CLOSED:
        child = new CWTextNodeSelfClosed(current, value);
        return current;
      case PARSER_STATE.LEFT:
        child = new CWTextNode(current, value);
        return current;
      case PARSER_STATE.OPEN:
        child = new CWTextNodeSurrounded(current, "");
        child.openTag = value;
        return child;
      case PARSER_STATE.CLOSE:
        if (current instanceof CWTextNodeSurrounded) {
          current.closeTag = value;
        }
        return current?.parent;
      default:
        return current;
    }
  }
}
