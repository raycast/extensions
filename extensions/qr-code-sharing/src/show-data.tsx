import { Action, ActionPanel, Clipboard, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import os from "os";
import path from "path";
import { useState } from "react";
import { codeBoxes, codeMarkdown, renderCode, writeCodeFile } from "./lib/codes";
import { BARCODE_FORMAT, QR_FORMAT } from "./lib/formats";
import { typingMarkdown } from "./lib/typing";

const TEXT_ID = "text";

const VIEWS = [
  { id: TEXT_ID, title: "Text", icon: Icon.Text },
  { id: QR_FORMAT.id, title: "QR Code", icon: Icon.Maximize },
  { id: BARCODE_FORMAT.id, title: "Barcode", icon: Icon.BarCode },
];

/** Reads the clipboard first, so the search bar can start out holding it. */
export default function Command() {
  const { data: clipboard, isLoading } = usePromise(() => Clipboard.readText());
  return isLoading ? <List isLoading /> : <ShowData initialText={clipboard ?? ""} />;
}

function ShowData({ initialText }: { initialText: string }) {
  const [searchText, setSearchText] = useState(initialText);
  const [selectedId, setSelectedId] = useState(TEXT_ID);
  const content = searchText.trim();
  const { preview: box } = codeBoxes();

  // Only the highlighted view is rendered, so moving through the list draws one code.
  const { data: result } = usePromise(
    async (text: string, id: string, size: typeof box) =>
      text && id !== TEXT_ID ? renderCode(text, id, size) : undefined,
    [content, selectedId, box],
  );

  async function copyImage(id: string) {
    try {
      const file = await writeCodeFile(content, id, path.join(os.tmpdir(), `code-${Date.now()}.png`));
      await Clipboard.copy({ file });
      await showToast({ style: Toast.Style.Success, title: "Image copied" });
    } catch (error) {
      await showFailureToast(error, { title: "Could not copy the image" });
    }
  }

  const detailFor = (id: string) => (
    <List.Item.Detail
      markdown={id !== selectedId ? "" : id === TEXT_ID ? typingMarkdown(content, box) : codeMarkdown(result)}
    />
  );

  return (
    <List
      filtering={false}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type anything to show it as a code…"
      isShowingDetail={content.length > 0}
      onSelectionChange={(id) => id && setSelectedId(id)}
    >
      <List.EmptyView icon={Icon.Clipboard} title="Nothing to show" description="Type or paste some text above." />
      {content
        ? VIEWS.map((view) => (
            <List.Item
              key={view.id}
              id={view.id}
              icon={view.icon}
              title={view.title}
              detail={detailFor(view.id)}
              actions={
                <ActionPanel>
                  {view.id !== TEXT_ID ? (
                    <Action
                      title="Copy Image"
                      icon={Icon.Clipboard}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                      onAction={() => copyImage(view.id)}
                    />
                  ) : null}
                  <Action.CopyToClipboard title="Copy Text" content={content} />
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}
