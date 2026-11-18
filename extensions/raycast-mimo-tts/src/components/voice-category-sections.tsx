import { List } from "@raycast/api";
import type { VoiceConfig } from "../api/mimo-types";
import { voiceIcon } from "../utils/mimo-voice-ui";

type VoiceGroup = {
  category: string;
  voices: VoiceConfig[];
};

type ListItemProps = Parameters<typeof List.Item>[0];

export function VoiceCategorySections({
  groups,
  renderAccessories,
  renderDetail,
  renderActions,
}: {
  groups: VoiceGroup[];
  renderAccessories: (voice: VoiceConfig) => List.Item.Accessory[];
  renderDetail: (voice: VoiceConfig) => ListItemProps["detail"];
  renderActions: (voice: VoiceConfig) => ListItemProps["actions"];
}) {
  return (
    <>
      {groups.map(({ category, voices }) => (
        <List.Section key={category} title={category}>
          {voices.map((voice) => (
            <List.Item
              key={voice.id}
              title={voice.name}
              subtitle={voice.description}
              icon={voiceIcon(voice)}
              keywords={[voice.id, voice.language, voice.category]}
              accessories={renderAccessories(voice)}
              detail={renderDetail(voice)}
              actions={renderActions(voice)}
            />
          ))}
        </List.Section>
      ))}
    </>
  );
}
