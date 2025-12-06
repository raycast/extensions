// Alias formatter utilities ported from web/src/rendering/alias_formatter.js

type ASTNode = Record<string, unknown>;

const NODE_VARIANTS = new Set([
  "Number",
  "Dice",
  "BinOp",
  "Var",
  "Assign",
  "Modifier",
  "Group",
  "Conditional",
]);

const OP_SYMBOLS: Record<string, string> = {
  Add: "+",
  Sub: "-",
  Mul: "*",
  Pow: "^",
  Gt: ">",
  Lt: "<",
  Gte: ">=",
  Lte: "<=",
  Eq: "==",
};

const OP_PRECEDENCE: Record<string, number> = {
  Gt: 1,
  Lt: 1,
  Gte: 1,
  Lte: 1,
  Eq: 1,
  Add: 2,
  Sub: 2,
  Mul: 3,
  Pow: 4,
};

const CONDITIONAL_PRECEDENCE = 0;
const MODIFIER_PRECEDENCE = 5;

interface FormattedNode {
  text: string;
  precedence: number;
}

function isNodeVariant(value: unknown): value is ASTNode {
  return Boolean(
    value &&
    typeof value === "object" &&
    NODE_VARIANTS.has(Object.keys(value as object)[0]),
  );
}

function formatFilter(filter: unknown): string {
  if (!filter || typeof filter !== "object") return "";
  const filterObj = filter as Record<string, unknown>;
  if ("KeepHigh" in filterObj) return `kh${filterObj.KeepHigh}`;
  if ("KeepLow" in filterObj) return `kl${filterObj.KeepLow}`;
  if ("DropHigh" in filterObj) return `dh${filterObj.DropHigh}`;
  if ("DropLow" in filterObj) return `dl${filterObj.DropLow}`;
  if ("Reroll" in filterObj) return `rr${filterObj.Reroll}`;
  if ("RerollOnce" in filterObj) return `ro${filterObj.RerollOnce}`;
  return "";
}

function formatDice(dice: Record<string, unknown>): FormattedNode {
  const parts = [`${dice.count}d${dice.faces}`];
  if (dice.advantage) parts.push("adv");
  if (dice.disadvantage) parts.push("dis");
  if (Array.isArray(dice.filters)) {
    for (const filter of dice.filters) {
      const formatted = formatFilter(filter);
      if (formatted) parts.push(formatted);
    }
  }
  return { text: parts.join(""), precedence: MODIFIER_PRECEDENCE };
}

function wrapIfNeeded(
  text: string,
  childPrec: number,
  parentPrec: number,
): string {
  if (childPrec < parentPrec) {
    return `(${text})`;
  }
  return text;
}

function formatAliasNode(node: ASTNode): FormattedNode {
  const [variant, payload] = Object.entries(node)[0];

  switch (variant) {
    case "Number":
      return { text: String(payload), precedence: MODIFIER_PRECEDENCE };
    case "Var":
      return { text: String(payload), precedence: MODIFIER_PRECEDENCE };
    case "Dice":
      return formatDice(payload as Record<string, unknown>);
    case "Group": {
      const items = Array.isArray(payload) ? payload : [];
      const formatted = items.map(
        (item) => formatAliasNode(item as ASTNode).text,
      );
      return { text: `(${formatted.join(", ")})`, precedence: 0 };
    }
    case "Modifier": {
      const modObj = payload as Record<string, unknown>;
      const inner = formatAliasNode(modObj.expr as ASTNode);
      return {
        text: `${wrapIfNeeded(inner.text, inner.precedence, MODIFIER_PRECEDENCE)}${modObj.mod_type}`,
        precedence: MODIFIER_PRECEDENCE,
      };
    }
    case "Assign": {
      const assignObj = payload as Record<string, unknown>;
      const rhs = formatAliasNode(assignObj.expr as ASTNode);
      return {
        text: `${assignObj.name}=${rhs.text}`,
        precedence: 0,
      };
    }
    case "BinOp": {
      const binopObj = payload as Record<string, unknown>;
      const opSymbol = OP_SYMBOLS[binopObj.op as string] || binopObj.op;
      const prec = OP_PRECEDENCE[binopObj.op as string] || 0;
      const left = formatAliasNode(binopObj.left as ASTNode);
      const right = formatAliasNode(binopObj.right as ASTNode);
      const leftText = wrapIfNeeded(left.text, left.precedence, prec);
      const rightText = wrapIfNeeded(right.text, right.precedence, prec + 0.1);
      return {
        text: `${leftText}${opSymbol}${rightText}`,
        precedence: prec,
      };
    }
    case "Conditional": {
      const condObj = payload as Record<string, unknown>;
      const condition = formatAliasNode(condObj.condition as ASTNode);
      const thenBranch = formatAliasNode(condObj.then_branch as ASTNode);
      const elseBranch = condObj.else_branch
        ? formatAliasNode(condObj.else_branch as ASTNode)
        : null;
      const condText = wrapIfNeeded(
        condition.text,
        condition.precedence,
        CONDITIONAL_PRECEDENCE,
      );
      const thenText = wrapIfNeeded(
        thenBranch.text,
        thenBranch.precedence,
        CONDITIONAL_PRECEDENCE,
      );
      const parts = [`${condText} ? ${thenText}`];
      if (elseBranch) {
        const elseText = wrapIfNeeded(
          elseBranch.text,
          elseBranch.precedence,
          CONDITIONAL_PRECEDENCE,
        );
        parts.push(`: ${elseText}`);
      }
      return { text: parts.join(" "), precedence: CONDITIONAL_PRECEDENCE };
    }
    default:
      return { text: JSON.stringify(node), precedence: 0 };
  }
}

export function formatAliasValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (isNodeVariant(value)) {
    return formatAliasNode(value).text;
  }

  try {
    return JSON.stringify(value);
  } catch (err) {
    console.warn("Failed to stringify alias value", err);
    return String(value);
  }
}

export { formatAliasNode, isNodeVariant };
