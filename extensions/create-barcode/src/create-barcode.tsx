import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Barcode, SymbologyId } from "./lib/barcode.ts";
import { copyPngToClipboard, copySvgSource, savePng, saveSvg } from "./lib/export.ts";
import { buildPreviewMarkdown } from "./lib/preview.ts";
import { encodeAll, findSymbology, SYMBOLOGIES, type SymbologyResult } from "./lib/symbologies.ts";

/** ドロップダウンで「自動判別」を選んだときの値 */
const AUTO = "auto";

type Filter = typeof AUTO | SymbologyId;

/** プレビューの表示高さ（ピクセル）。⌘] / ⌘[ で切り替える */
const PREVIEW_HEIGHTS = [120, 160, 200, 250, 320];
const DEFAULT_HEIGHT = 200;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [height, setHeight, isLoadingHeight] = useStoredState("preview-height", DEFAULT_HEIGHT);
  const [storedFilter, setSelected, isLoadingFilter] = useStoredState<Filter>("symbology", AUTO);
  const selected = normalizeFilter(storedFilter);

  const results = useMemo(() => encodeAll(searchText), [searchText]);
  const shown = useMemo(() => filterResults(results, selected), [results, selected]);
  const matched = shown.filter((entry) => entry.result.ok);

  return (
    <List
      isLoading={isLoadingHeight || isLoadingFilter}
      isShowingDetail={matched.length > 0}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={placeholderFor(selected)}
      navigationTitle="Create Barcode"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Barcode Type"
          value={selected}
          // マウント直後にも同じ値で呼ばれるので、変化したときだけ受け取る
          onChange={(value) => {
            if (value !== selected) {
              setSelected(value as Filter);
            }
          }}
        >
          <List.Dropdown.Item title="Auto Detect" value={AUTO} icon={Icon.MagnifyingGlass} />
          <List.Dropdown.Section title="Symbology">
            {SYMBOLOGIES.map((symbology) => (
              <List.Dropdown.Item key={symbology.id} title={symbology.label} value={symbology.id} icon={Icon.BarCode} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {matched.length > 0 ? (
        matched.map((entry) =>
          entry.result.ok ? (
            <BarcodeItem
              key={entry.symbology.id}
              barcode={entry.result.barcode}
              warning={entry.result.warning}
              height={height}
              onHeightChange={setHeight}
            />
          ) : null,
        )
      ) : (
        <ErrorView results={shown} isEmptyInput={searchText.trim().length === 0} />
      )}
    </List>
  );
}

/**
 * ローカルストレージに残しつつ、画面はローカルの状態で即座に更新する。
 *
 * `useLocalStorage` の値をそのまま描画に使うと、保存のたびに `isLoading` が立ち直して
 * ドロップダウンやローディング表示がちらつく。読み込みが終わった最初の1回だけ
 * 保存値を取り込み、以降は画面側の状態を正とする。
 */
function useStoredState<T>(key: string, initialValue: T) {
  const { value, setValue, isLoading } = useLocalStorage<T>(key, initialValue);
  const [state, setState] = useState<T>(initialValue);
  const restored = useRef(false);

  useEffect(() => {
    if (isLoading || restored.current) {
      return;
    }
    restored.current = true;
    if (value !== undefined) {
      setState(value);
    }
  }, [isLoading, value]);

  const update = useCallback(
    (next: T) => {
      setState(next);
      setValue(next);
    },
    [setValue],
  );

  // 保存し直したときの読み込みではちらつかせない
  return [state, update, isLoading && !restored.current] as const;
}

/**
 * 保存されていた選択を今のシンボロジー一覧と突き合わせる。
 * 一覧から消えた種類（旧 "jan13" など）が残っていた場合は自動判別に戻す。
 */
function normalizeFilter(filter: Filter): Filter {
  return filter === AUTO || findSymbology(filter) ? filter : AUTO;
}

/** ドロップダウンの選択に応じて、表示する結果を絞り込む */
function filterResults(results: SymbologyResult[], filter: Filter): SymbologyResult[] {
  if (filter === AUTO) {
    return results;
  }
  return results.filter((entry) => entry.symbology.id === filter);
}

function placeholderFor(filter: Filter): string {
  const symbology = findSymbology(filter);
  return symbology ? symbology.placeholder : "Enter a code (EAN-13 / ITF / NW-7 / CODE39 / CODE128)";
}

function BarcodeItem({
  barcode,
  warning,
  height,
  onHeightChange,
}: {
  barcode: Barcode;
  warning?: string;
  height: number;
  onHeightChange: (height: number) => void;
}) {
  const markdown = useMemo(() => buildPreviewMarkdown(barcode, height), [barcode, height]);

  return (
    <List.Item
      id={barcode.symbology}
      icon={warning ? { source: Icon.Warning, tintColor: Color.Orange } : Icon.BarCode}
      title={barcode.label}
      // subtitle={barcode.code}
      accessories={barcode.notice ? [{ tag: { value: barcode.notice, color: Color.Green } }] : undefined}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Code" text={barcode.code} />
              <List.Item.Detail.Metadata.Label title="Type" text={barcode.label} />
              {barcode.details.map((detail) => (
                <List.Item.Detail.Metadata.Label key={detail.title} title={detail.title} text={detail.text} />
              ))}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Modules" text={`${barcode.modules.length}`} />
              <List.Item.Detail.Metadata.Label title="Preview Height" text={`${height} px`} />
              {warning ? (
                <List.Item.Detail.Metadata.Label
                  title="Warning"
                  text={warning}
                  icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action title="Copy PNG" icon={Icon.Image} onAction={() => copyPngToClipboard(barcode)} />
            <Action
              title="Copy SVG Source"
              icon={Icon.Code}
              shortcut={crossPlatform(["alt"], "c")}
              onAction={() => copySvgSource(barcode)}
            />
            <Action.CopyToClipboard title="Copy Code" content={barcode.code} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Save">
            <Action
              title="Save PNG"
              icon={Icon.Download}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={() => savePng(barcode)}
            />
            <Action
              title="Save SVG"
              icon={Icon.Download}
              shortcut={crossPlatform(["shift"], "e")}
              onAction={() => saveSvg(barcode)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Preview">
            <Action
              title="Zoom in"
              icon={Icon.Plus}
              shortcut={crossPlatform([], "]")}
              onAction={() => onHeightChange(stepHeight(height, 1))}
            />
            <Action
              title="Zoom out"
              icon={Icon.Minus}
              shortcut={crossPlatform([], "[")}
              onAction={() => onHeightChange(stepHeight(height, -1))}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/**
 * どのシンボロジーでも符号化できなかったときの表示。
 * 自動判別のときは、いちばん受け入れ幅が広い CODE128 の理由を出す。
 */
function ErrorView({ results, isEmptyInput }: { results: SymbologyResult[]; isEmptyInput: boolean }) {
  if (isEmptyInput) {
    return (
      <List.EmptyView icon={Icon.BarCode} title="Enter a code" description="EAN-13 / ITF / NW-7 / CODE39 / CODE128" />
    );
  }

  const failures = results.flatMap((entry) => (entry.result.ok ? [] : [entry.result]));
  const failure = failures[failures.length - 1];

  return (
    <List.EmptyView
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
      title={failure?.message ?? "This input cannot be encoded"}
      description={failure?.hint}
    />
  );
}

/** macOS の ⌘ と Windows の Ctrl を対応させたショートカットを作る */
function crossPlatform(extraModifiers: Keyboard.KeyModifier[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", ...extraModifiers], key },
    Windows: { modifiers: ["ctrl", ...extraModifiers], key },
  };
}

/** 表示高さを1段階ずらす */
function stepHeight(current: number, direction: number): number {
  const index = PREVIEW_HEIGHTS.indexOf(current);
  const base = index === -1 ? PREVIEW_HEIGHTS.indexOf(DEFAULT_HEIGHT) : index;
  const next = Math.min(PREVIEW_HEIGHTS.length - 1, Math.max(0, base + direction));
  return PREVIEW_HEIGHTS[next];
}
