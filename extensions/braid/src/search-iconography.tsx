import { Action, ActionPanel, Grid, Keyboard } from "@raycast/api";
import fs from "fs";
import path from "path";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import * as ts from "typescript";

const iconsKeywordsUrl =
  "https://raw.githubusercontent.com/seek-oss/braid-design-system/refs/heads/master/site/src/App/routes/foundations/iconography/iconsKeywords.ts";

function extractArrayValue(node: ts.Node): string[] {
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((el) => {
      if (ts.isStringLiteral(el)) {
        return el.text;
      }
      throw new Error("Expected string literal");
    });
  }
  throw new Error("Expected array literal");
}

const getIconDataString = (svgContent: string) => `data:image/svg+xml;base64,${btoa(svgContent)}`;

export default function Command() {
  const { isLoading, data: iconsKeywordsFile } = useFetch(iconsKeywordsUrl);

  let iconsKeywords: Record<string, string[]> = {};

  if (!isLoading && iconsKeywordsFile) {
    const sourceFile = ts.createSourceFile(
      "iconsKeywords.ts",
      iconsKeywordsFile as string,
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS,
    );

    const [iconsKeywordsParsed] = sourceFile.statements.flatMap((stmt) =>
      ts.isVariableStatement(stmt) &&
      ts.isVariableDeclaration(stmt.declarationList.declarations[0]) &&
      stmt.declarationList.declarations[0].name.getText(sourceFile) === "iconsKeywords"
        ? [stmt.declarationList.declarations[0]]
        : [],
    );

    if (
      !iconsKeywordsParsed ||
      !iconsKeywordsParsed.initializer ||
      !ts.isObjectLiteralExpression(iconsKeywordsParsed.initializer)
    ) {
      throw new Error("iconsKeywords not found");
    }

    iconsKeywords = Object.fromEntries(
      iconsKeywordsParsed.initializer.properties.map((prop) => [
        prop.name?.getText(sourceFile),
        // Todo - resolve type issue
        // @ts-expect-error - Type issue
        extractArrayValue(prop.initializer),
      ]),
    );
  }

  const [selectedItem, setSelectedItem] = useState<string>(Object.keys(iconsKeywords)[0]);

  // This icon is not shown in the grid,
  // It is used as a fallback for current selected item when no results match
  const fallbackIcon = {
    name: "Error",
    displayName: "Error",
    url: "Error",
    keywords: [],
    svgPath: {
      light: "error",
      dark: "error",
    },
  };

  return (
    <Grid
      isLoading={isLoading}
      columns={8}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search Braid Iconography"
      navigationTitle={selectedItem === "Error" ? "Search Iconography" : `Search Iconography - ${selectedItem}`}
      onSelectionChange={(itemId) => setSelectedItem(itemId || fallbackIcon.name)}
    >
      {Object.entries(iconsKeywords).map(([name, keywords]) => {
        const displayName = name.replace("Icon", "");
        const url = `https://seek-oss.github.io/braid-design-system/components/${name}`;

        let svgContentLight = "";
        let svgContentDark = "";

        try {
          svgContentLight = fs.readFileSync(path.join(__dirname, `/assets/icons/${displayName}-light.svg`), "utf-8");
          svgContentDark = fs.readFileSync(path.join(__dirname, `/assets/icons/${displayName}-dark.svg`), "utf-8");
        } catch (error) {
          console.error("Error reading icon file", error);
          return null;
        }

        return (
          <Grid.Item
            id={name}
            key={name}
            content={{
              value: {
                source: {
                  light: getIconDataString(svgContentLight),
                  dark: getIconDataString(svgContentDark),
                },
              },
              tooltip: name,
            }}
            keywords={[name, displayName, ...keywords]}
            actions={
              <ActionPanel>
                {/* eslint-disable-next-line @raycast/prefer-title-case */}
                <Action.Paste title="Paste Icon JSX" content={`<${name} />`} />
                <Action.OpenInBrowser url={url} shortcut={Keyboard.Shortcut.Common.Open} />
                <Action.CopyToClipboard
                  title="Copy Icon Name"
                  content={name}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
