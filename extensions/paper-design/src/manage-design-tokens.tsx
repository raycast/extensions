import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

import {
  listPaperFiles,
  listPaperTokens,
  PaperMcpUnavailableError,
  type PaperFile,
  type PaperToken,
  type PaperTokenType,
} from "./paper-mcp";
import { TokenForm } from "./token-form";

type TokenSection = {
  title: string;
  types: PaperTokenType[];
};

const tokenSections: TokenSection[] = [
  { title: "Colors", types: ["color"] },
  {
    title: "Typography",
    types: [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "letterSpacing",
      "lineHeight",
    ],
  },
  { title: "Spacing & Radius", types: ["spacing", "radius"] },
  { title: "Layout", types: ["breakpoint", "container"] },
];
const paperIcon = "extension-icon.png";
const paperFileIcon = Icon.AppWindowGrid2x2;

export default function ManageDesignTokensCommand() {
  const [selectedFileId, setSelectedFileId] = useState<string>();
  const {
    data: filesData,
    error: filesError,
    isLoading: isFilesLoading,
    revalidate: revalidateFiles,
  } = usePromise(listPaperFiles, [], { onError: () => undefined });
  const files = filesData ?? [];
  const openFiles = files.filter(isOpenInPaper);
  const recentFiles = files.filter((file) => !isOpenInPaper(file));
  const selectedFile =
    files.find((file) => file.id === selectedFileId) ??
    files.find((file) => file.active) ??
    openFiles[0] ??
    recentFiles[0];
  const {
    data: tokensData,
    error: tokensError,
    isLoading: isTokensLoading,
    revalidate: revalidateTokens,
  } = usePromise(listTokensForFile, [selectedFile?.id], {
    onError: () => undefined,
  });
  const tokens = tokensData ?? [];
  const error = filesError ?? tokensError;
  const isLoading =
    isFilesLoading || (selectedFile !== undefined && isTokensLoading);

  async function revalidateTokenList() {
    await revalidateTokens();
  }

  async function refresh() {
    await Promise.all([revalidateFiles(), revalidateTokens()]);
  }

  return (
    <List
      navigationTitle={
        selectedFile ? `Tokens in ${selectedFile.name}` : "Manage Design Tokens"
      }
      searchBarPlaceholder="Search tokens..."
      searchBarAccessory={
        files.length > 0 ? (
          <List.Dropdown
            tooltip="Choose Paper File"
            value={selectedFile?.id}
            onChange={setSelectedFileId}
          >
            {openFiles.length > 0 ? (
              <List.Dropdown.Section title="Open">
                {openFiles.map((file) => (
                  <List.Dropdown.Item
                    key={file.id}
                    value={file.id}
                    title={file.active ? `${file.name} (Current)` : file.name}
                    icon={paperFileIcon}
                  />
                ))}
              </List.Dropdown.Section>
            ) : null}
            {recentFiles.length > 0 ? (
              <List.Dropdown.Section title="Recent">
                {recentFiles.map((file) => (
                  <List.Dropdown.Item
                    key={file.id}
                    value={file.id}
                    title={file.name}
                    icon={paperFileIcon}
                  />
                ))}
              </List.Dropdown.Section>
            ) : null}
          </List.Dropdown>
        ) : null
      }
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
    >
      {!isLoading && error ? (
        <TokenErrorState error={error} onRefresh={refresh} />
      ) : !isLoading && files.length === 0 ? (
        <List.EmptyView
          icon={paperIcon}
          title="No Paper files"
          description="Open Paper Desktop and refresh to see files"
          actions={<RefreshActionPanel onRefresh={refresh} />}
        />
      ) : !isLoading && selectedFile && tokens.length === 0 ? (
        <List.EmptyView
          icon={Icon.Swatch}
          title="No design tokens"
          description={`${selectedFile.name} does not have any design tokens yet.`}
          actions={
            <TokenActionPanel
              file={selectedFile}
              tokens={tokens}
              onChanged={revalidateTokenList}
              onRefresh={refresh}
            />
          }
        />
      ) : (
        tokenSections.map((section) => {
          const sectionTokens = tokens
            .filter((token) => section.types.includes(token.type))
            .sort((left, right) => left.name.localeCompare(right.name));

          if (sectionTokens.length === 0 || !selectedFile) {
            return null;
          }

          return (
            <List.Section key={section.title} title={section.title}>
              {sectionTokens.map((token) => (
                <TokenListItem
                  key={token.name}
                  token={token}
                  file={selectedFile}
                  tokens={tokens}
                  onChanged={revalidateTokenList}
                  onRefresh={refresh}
                />
              ))}
            </List.Section>
          );
        })
      )}
    </List>
  );
}

function TokenListItem({
  file,
  token,
  tokens,
  onChanged,
  onRefresh,
}: {
  file: PaperFile;
  token: PaperToken;
  tokens: PaperToken[];
  onChanged: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <List.Item
      id={token.name}
      icon={getTokenIcon(token)}
      title={token.name}
      subtitle={token.description}
      accessories={[{ text: String(token.value) }]}
      keywords={[
        token.name,
        String(token.value),
        ...(token.description ? [token.description] : []),
      ]}
      actions={
        <TokenActionPanel
          file={file}
          tokens={tokens}
          token={token}
          onChanged={onChanged}
          onRefresh={onRefresh}
        />
      }
    />
  );
}

function TokenActionPanel({
  file,
  tokens,
  token,
  onChanged,
  onRefresh,
}: {
  file: PaperFile;
  tokens: PaperToken[];
  token?: PaperToken;
  onChanged: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <ActionPanel>
      {token ? (
        <Action.Push
          title="Edit Token"
          icon={Icon.Pencil}
          target={
            <TokenForm
              file={file}
              token={token}
              tokens={tokens}
              onChanged={onChanged}
            />
          }
        />
      ) : null}
      {token ? (
        <Action.CopyToClipboard
          title="Copy Token Reference"
          content={`var(${token.name})`}
          icon={Icon.Link}
        />
      ) : null}
      {token ? (
        <Action.CopyToClipboard
          title="Copy Token Declaration"
          content={`${token.name}: ${token.value};`}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : null}
      {token ? (
        <Action.CopyToClipboard
          title="Copy Token Value"
          content={String(token.value)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        />
      ) : null}
      {token ? (
        <Action.CopyToClipboard
          title="Copy Token Name"
          content={token.name}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
      ) : null}
      <Action.Push
        title="Create Token"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<TokenForm file={file} tokens={tokens} onChanged={onChanged} />}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
    </ActionPanel>
  );
}

function TokenErrorState({
  error,
  onRefresh,
}: {
  error: Error;
  onRefresh: () => Promise<void>;
}) {
  const isUnavailable = error instanceof PaperMcpUnavailableError;

  return (
    <List.EmptyView
      icon={isUnavailable ? paperIcon : Icon.Warning}
      title={
        isUnavailable
          ? "Open Paper Desktop"
          : "Paper returned an unexpected response"
      }
      description={
        isUnavailable
          ? "Open Paper Desktop and refresh to manage tokens"
          : "Make sure Paper Desktop is running with a Paper file loaded, then refresh."
      }
      actions={<RefreshActionPanel onRefresh={onRefresh} />}
    />
  );
}

function RefreshActionPanel({ onRefresh }: { onRefresh: () => Promise<void> }) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
    </ActionPanel>
  );
}

function getTokenIcon(token: PaperToken): Image.ImageLike {
  if (token.type === "color" && isColorValue(token.value)) {
    return {
      source: Icon.CircleFilled,
      tintColor: {
        light: token.value,
        dark: token.value,
        adjustContrast: false,
      },
    };
  }

  if (isTokenAlias(token.value)) {
    return Icon.Link;
  }

  if (token.type === "spacing" || token.type === "radius") {
    return Icon.Ruler;
  }

  if (token.type === "breakpoint" || token.type === "container") {
    return Icon.Box;
  }

  return Icon.Text;
}

function isColorValue(value: string | number): value is string {
  return (
    typeof value === "string" &&
    /^(#|rgb\(|hsl\(|oklch\(|color\()/i.test(value.trim())
  );
}

function isTokenAlias(value: string | number): boolean {
  return typeof value === "string" && /^var\(\s*--/.test(value.trim());
}

async function listTokensForFile(
  fileId: string | undefined,
): Promise<PaperToken[]> {
  return fileId ? listPaperTokens(fileId) : [];
}

function isOpenInPaper(file: PaperFile): boolean {
  return file.open === true || file.active === true;
}
