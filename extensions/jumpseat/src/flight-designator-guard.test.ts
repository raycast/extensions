import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const RULE_MODULE = "flight-designator.ts";
const AIRLINE_CODE = /iata|icao|airlinecode|carrier/i;
const FLIGHT_NUMBER = /flightnumber|flightno|^number$/i;

function mentions(node: ts.Node, pattern: RegExp): boolean {
  if (ts.isIdentifier(node) && pattern.test(node.text)) return true;
  if (
    ts.isElementAccessExpression(node) &&
    ts.isStringLiteralLike(node.argumentExpression) &&
    pattern.test(node.argumentExpression.text)
  ) {
    return true;
  }
  return ts.forEachChild(node, (child) => mentions(child, pattern)) ?? false;
}

function joinsCodeWithNumber(parts: readonly ts.Node[]): boolean {
  const code = parts.findIndex((part) => mentions(part, AIRLINE_CODE));
  const number = parts.findIndex((part) => mentions(part, FLIGHT_NUMBER));
  return code !== -1 && number !== -1 && code !== number;
}

function plusOperands(node: ts.Expression): ts.Expression[] {
  const expression = ts.isParenthesizedExpression(node)
    ? node.expression
    : node;
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    return [
      ...plusOperands(expression.left),
      ...plusOperands(expression.right),
    ];
  }
  return [expression];
}

function arrayElements(node: ts.Expression): readonly ts.Node[] | null {
  if (ts.isArrayLiteralExpression(node)) return node.elements;
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression)
  ) {
    return arrayElements(node.expression.expression);
  }
  return null;
}

function isNestedPlus(node: ts.BinaryExpression): boolean {
  let parent = node.parent;
  while (ts.isParenthesizedExpression(parent)) parent = parent.parent;
  return (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.PlusToken
  );
}

function concatenatedParts(node: ts.Node): readonly ts.Node[] | null {
  if (ts.isTemplateExpression(node)) {
    return node.templateSpans.map((span) => span.expression);
  }
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
    !isNestedPlus(node)
  ) {
    return plusOperands(node);
  }
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression)
  ) {
    const receiver = node.expression.expression;
    if (node.expression.name.text === "join") return arrayElements(receiver);
    if (node.expression.name.text === "concat") {
      return [receiver, ...node.arguments];
    }
  }
  return null;
}

function designatorConcatenations(fileName: string, source: string): string[] {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    const parts = concatenatedParts(node);
    if (parts && joinsCodeWithNumber(parts)) {
      const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
      found.push(`${fileName}:${line + 1}: ${node.getText(file)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

describe("flight designator guard", () => {
  it("leaves joining airline codes and flight numbers to the rule module", () => {
    const sourceFiles = readdirSync(__dirname).filter(
      (name) =>
        /\.tsx?$/.test(name) &&
        !/\.test\.tsx?$/.test(name) &&
        name !== RULE_MODULE,
    );
    const violations = sourceFiles.flatMap((name) =>
      designatorConcatenations(
        name,
        readFileSync(join(__dirname, name), "utf8"),
      ),
    );

    expect(
      violations,
      `Build flight designators with displayFlightNumber or src/${RULE_MODULE} ` +
        "(jumpseat-mobile Contracts/FlightDesignators), never by joining an " +
        "airline code and a flight number:\n" +
        violations.join("\n"),
    ).toEqual([]);
  });

  it.each([
    ["template literal", "const a = `${flight.airline.iata} ${flightNumber}`;"],
    ["local variables", "const a = `${airlineCode} ${number}`;"],
    ["plus", 'const a = airline.iata + " " + flight.flightNumber;'],
    ["parenthesized plus", 'const a = (airline.icao + "") + flightNo;'],
    ["array join", 'const a = [carrierCode, flight.flightNumber].join(" ");'],
    [
      "filtered array join",
      'const a = [airline.iata, flightNumber].filter(Boolean).join("");',
    ],
    ["concat", "const a = airline.iata.concat(flight.flightNumber);"],
    [
      "element access",
      'const a = `${airline["iata"]}${flight["flightNumber"]}`;',
    ],
    [
      "designator under a code",
      "const a = `${iata} ${displayFlightNumber(f)}`;",
    ],
  ])("catches %s", (_name, source) => {
    expect(designatorConcatenations("example.ts", source)).toHaveLength(1);
  });

  it.each([
    [
      "designator and route",
      "const a = `${displayFlightNumber(f)} · ${route(f)}`;",
    ],
    ["airport codes", "const a = `${departureCode} → ${arrivalCode}`;"],
    ["call arguments", "const a = `${format(airline.iata, flightNumber)}`;"],
    ["rule call", "const a = parse({ airlineCode: iata, flightNumber });"],
  ])("allows %s", (_name, source) => {
    expect(designatorConcatenations("example.ts", source)).toEqual([]);
  });
});
