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
  r: "Red Output",
  g: "Green Output",
  b: "Blue Output",
};

export function ResultView({ conversion }: ResultViewProps) {
  return (
    <List navigationTitle={`${conversion.sourceHex} → ${conversion.targetHex}`}>
      <List.Section title="RGB Preview">
        <List.Item
          title="Source Color"
          subtitle={`${conversion.sourceHex} · RGB ${conversion.sourceRgb.r}, ${conversion.sourceRgb.g}, ${conversion.sourceRgb.b}`}
          icon={colorSwatch(conversion.sourceHex)}
          accessories={[{ text: `Luminance ${conversion.sourceLuminance}` }]}
        />
        <List.Item
          title="Target Color"
          subtitle={`${conversion.targetHex} · RGB ${conversion.targetRgb.r}, ${conversion.targetRgb.g}, ${conversion.targetRgb.b}`}
          icon={colorSwatch(conversion.targetHex)}
          accessories={[
            { text: `Predicted ${rgbToHex(conversion.predictedRgb)}` },
          ]}
        />
      </List.Section>

      <List.Section title="Photoshop Channel Mixer Recommendations">
        {conversion.channels.map((channel) => (
          <List.Item
            key={channel.output}
            title={CHANNEL_LABELS[channel.output]}
            subtitle={`R ${formatPercentage(channel.red)} · G ${formatPercentage(channel.green)} · B ${formatPercentage(channel.blue)}`}
            accessories={[
              { tag: `Constant ${formatPercentage(channel.constant)}` },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy This Output Channel"
                  content={formatChannel(channel)}
                />
                <Action.CopyToClipboard
                  title="Copy All Recommendations"
                  content={formatConversion(conversion)}
                />
                <Action.Push
                  title="Edit Again"
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
                  title="View Conversion History"
                  icon={Icon.Clock}
                  target={<HistoryView />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Algorithm Notes">
        <List.Item
          title="Stable Luminance Mix"
          subtitle="All three output channels share R 29.9% / G 58.7% / B 11.4% weights to reduce the risk of over-amplifying one channel."
        />
        <List.Item
          title="100% Gain Ceiling"
          subtitle="When the target is brighter than the source, Constant supplies the lift instead of further amplifying input channels."
        />
        <List.Item
          title="Predicted Output"
          subtitle={`${rgbToHex(conversion.predictedRgb)} (calculated with the displayed one-decimal coefficients; may differ from the target by 1–2 levels)`}
        />
      </List.Section>
    </List>
  );
}
