import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { ResultView } from "./components/ResultView";
import { calculateConversion, COMMON_TARGETS, normalizeHex } from "./lib/color";
import { saveHistory } from "./lib/history";
import { HistoryView } from "./history";

type ColorConverterProps = {
  initialSource?: string;
  initialTarget?: string;
};

export function ColorConverter({
  initialSource = "#7A213E",
  initialTarget = "#1D262D",
}: ColorConverterProps) {
  const { push } = useNavigation();
  const [sourceHex, setSourceHex] = useState(initialSource);
  const [targetHex, setTargetHex] = useState(initialTarget);
  const [preset, setPreset] = useState(
    COMMON_TARGETS.find((item) => item.hex === initialTarget)?.id ?? "",
  );
  const [sourceError, setSourceError] = useState<string>();
  const [targetError, setTargetError] = useState<string>();

  async function handleSubmit() {
    const normalizedSource = normalizeHex(sourceHex);
    const normalizedTarget = normalizeHex(targetHex);
    setSourceError(
      normalizedSource ? undefined : "請輸入 3 碼或 6 碼 HEX，例如 #7A213E",
    );
    setTargetError(
      normalizedTarget ? undefined : "請輸入 3 碼或 6 碼 HEX，例如 #1D262D",
    );

    if (!normalizedSource || !normalizedTarget) {
      await showToast({ style: Toast.Style.Failure, title: "HEX 格式不正確" });
      return;
    }

    const conversion = calculateConversion(normalizedSource, normalizedTarget);
    if (!conversion) {
      await showToast({
        style: Toast.Style.Failure,
        title: "無法計算這組顏色",
      });
      return;
    }

    await saveHistory(conversion);
    push(<ResultView conversion={conversion} />);
  }

  function handlePresetChange(value: string) {
    setPreset(value);
    const selected = COMMON_TARGETS.find((item) => item.id === value);
    if (selected) {
      setTargetHex(selected.hex);
      setTargetError(undefined);
    }
  }

  return (
    <Form
      navigationTitle="HEX 色版混合器轉換"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="計算 Channel Mixer"
            icon={Icon.ArrowRight}
            onSubmit={handleSubmit}
          />
          <Action.Push
            title="查看轉換歷史"
            icon={Icon.Clock}
            target={<HistoryView />}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="穩定模式"
        text="使用共享感知亮度權重，避免單獨放大某一色版造成偏色；需要提升亮度時會自動使用 Constant。"
      />
      <Form.TextField
        id="sourceHex"
        title="來源 HEX"
        placeholder="#7A213E"
        value={sourceHex}
        error={sourceError}
        onChange={(value) => {
          setSourceHex(value);
          setSourceError(undefined);
        }}
      />
      <Form.TextField
        id="targetHex"
        title="目標 HEX"
        placeholder="#1D262D"
        value={targetHex}
        error={targetError}
        onChange={(value) => {
          setTargetHex(value);
          setPreset(
            COMMON_TARGETS.find((item) => item.hex === normalizeHex(value))
              ?.id ?? "",
          );
          setTargetError(undefined);
        }}
      />
      <Form.Dropdown
        id="targetPreset"
        title="常用目標色"
        value={preset}
        onChange={handlePresetChange}
      >
        <Form.Dropdown.Item value="" title="不使用預設" />
        {COMMON_TARGETS.map((item) => (
          <Form.Dropdown.Item
            key={item.id}
            value={item.id}
            title={`${item.title} ${item.hex}`}
          />
        ))}
      </Form.Dropdown>
      <Form.Description
        title="小提示"
        text="支援 #RGB 與 #RRGGBB；結果頁可分別複製單一輸出色版或一次複製全部建議值。"
      />
    </Form>
  );
}

export default function Command() {
  return <ColorConverter />;
}
