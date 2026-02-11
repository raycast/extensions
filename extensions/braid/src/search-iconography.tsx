import { Action, ActionPanel, Detail, Grid, Keyboard } from "@raycast/api";
import { useMemo, useState } from "react";
import { useFetch } from "@raycast/utils";
import * as ts from "typescript";
import { useIcons } from "./useIcons";

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
  const { isLoading, data: iconsKeywordsFile, error: iconsKeywordsError } = useFetch(iconsKeywordsUrl);

  const iconsKeywords: Record<string, string[]> = useMemo(() => {
    if (isLoading || !iconsKeywordsFile) {
      return {};
    }

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

    return Object.fromEntries(
      iconsKeywordsParsed.initializer.properties.map((prop) => [
        prop.name?.getText(sourceFile),
        // Todo - resolve type issue
        // @ts-expect-error - Type issue
        extractArrayValue(prop.initializer),
      ]),
    );
  }, [iconsKeywordsFile, isLoading]);

  const { svgFiles: iconSvgs, isLoading: isLoadingSvgs, error: errorSvgs } = useIcons();

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

  if (iconsKeywordsError) {
    return <Detail markdown={`Error loading icons keywords: ${iconsKeywordsError.message}`} />;
  }

  if (errorSvgs) {
    return <Detail markdown={`Error loading icons: ${errorSvgs.message}`} />;
  }

  return (
    <Grid
      isLoading={isLoading || isLoadingSvgs}
      columns={8}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search Braid Iconography"
      navigationTitle={selectedItem === "Error" ? "Search Iconography" : `Search Iconography - ${selectedItem}`}
      onSelectionChange={(itemId) => setSelectedItem(itemId || fallbackIcon.name)}
    >
      {iconSvgs?.map(({ iconName: name, content, darkContent }) => {
        const displayName = name.replace(/^Icon/, "");
        const url = `https://seek-oss.github.io/braid-design-system/components/${name}`;

        return (
          <Grid.Item
            id={name}
            key={name}
            content={{
              value: {
                source: {
                  light: getIconDataString(content),
                  dark: getIconDataString(darkContent),
                },
              },
              tooltip: name,
            }}
            keywords={[name, displayName, ...(iconsKeywords[name] ?? [])]}
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
