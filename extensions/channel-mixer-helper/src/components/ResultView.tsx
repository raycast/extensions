import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import {
  ColorConversion,
  formatChannel,
  formatConversion,
  formatPercentage,
  rgbToHex,
} from "../lib/color";
import { colorSwatch } from "../lib/ui";
import { HistoryView } from "../history";
import { ColorConverter } from "../convert-color";

type ResultViewProps = {
  conversion: ColorConversion;
};

const CHANNEL_LABELS = {
  r: "紅色 Output",
  g: "綠色 Output",
  b: "藍色 Output",
};

export function ResultView({ conversion }: ResultViewProps) {
  return (
    <List navigationTitle={`${conversion.sourceHex} → ${conversion.targetHex}`}>
      <List.Section title="RGB 預覽">
        <List.Item
          title="來源色"
          subtitle={`${conversion.sourceHex} · RGB ${conversion.sourceRgb.r}, ${conversion.sourceRgb.g}, ${conversion.sourceRgb.b}`}
          icon={colorSwatch(conversion.sourceHex)}
          accessories={[{ text: `亮度 ${conversion.sourceLuminance}` }]}
        />
        <List.Item
          title="目標色"
          subtitle={`${conversion.targetHex} · RGB ${conversion.targetRgb.r}, ${conversion.targetRgb.g}, ${conversion.targetRgb.b}`}
          icon={colorSwatch(conversion.targetHex)}
          accessories={[{ text: `預估 ${rgbToHex(conversion.predictedRgb)}` }]}
        />
      </List.Section>

      <List.Section title="Photoshop Channel Mixer 建議值">
        {conversion.channels.map((channel) => (
          <List.Item
            key={channel.output}
            title={CHANNEL_LABELS[channel.output]}
            subtitle={`R ${formatPercentage(channel.red)} · G ${formatPercentage(channel.green)} · B ${formatPercentage(channel.blue)}`}
            accessories={[
              { tag: `常數 ${formatPercentage(channel.constant)}` },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="複製此輸出色版"
                  content={formatChannel(channel)}
                />
                <Action.CopyToClipboard
                  title="複製全部建議值"
                  content={formatConversion(conversion)}
                />
                <Action.Push
                  title="重新編輯"
                  icon={Icon.Pencil}
                  target={
                    <ColorConverter
                      initialSource={conversion.sourceHex}
                      initialTarget={conversion.targetHex}
                    />
                  }
                  shortcut={Keyboard.Shortcut.Common.Edit}
                />
                <Action.Push
                  title="查看轉換歷史"
                  icon={Icon.Clock}
                  target={<HistoryView />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="算法說明">
        <List.Item
          title="穩定亮度混合"
          subtitle="三個輸出色版共享 R 29.9% / G 58.7% / B 11.4% 權重，降低單一色版被過度放大的風險。"
        />
        <List.Item
          title="增益上限 100%"
          subtitle="目標比來源亮時，使用 Constant 補足，而不是繼續放大輸入通道。"
        />
        <List.Item
          title="預估輸出"
          subtitle={`${rgbToHex(conversion.predictedRgb)}（依畫面顯示的一位小數係數計算，可能與目標差 1–2 級）`}
        />
      </List.Section>
    </List>
  );
}
