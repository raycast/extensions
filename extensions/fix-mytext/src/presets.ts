export type PresetId = 'grammar' | 'clarity' | 'professional' | 'casual' | 'concise';

export type Preset = {
  id: PresetId;
  title: string;
  description: string;
  instruction: string;
};

export const PRESETS: Preset[] = [
  {
    id: 'grammar',
    title: 'Fix Grammar',
    description: 'Correct grammar, spelling, punctuation, and awkward phrasing.',
    instruction:
      'Fix grammar, spelling, punctuation, and minor phrasing issues while preserving the original meaning and voice.',
  },
  {
    id: 'clarity',
    title: 'Improve Clarity',
    description: 'Make the writing easier to follow without changing the message.',
    instruction:
      'Improve clarity, flow, and readability while preserving the original meaning and overall tone.',
  },
  {
    id: 'professional',
    title: 'More Professional',
    description: 'Tighten the text and shift it toward a professional tone.',
    instruction:
      'Rewrite the text in a more professional, polished tone while preserving the original meaning.',
  },
  {
    id: 'casual',
    title: 'More Casual',
    description: 'Make the wording sound more natural and conversational.',
    instruction:
      'Rewrite the text in a more casual, natural tone while preserving the original meaning.',
  },
  {
    id: 'concise',
    title: 'Make Concise',
    description: 'Shorten the text without losing important information.',
    instruction:
      'Make the text more concise and direct without losing important meaning or changing the intent.',
  },
];

export function getPreset(id: PresetId): Preset {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
}
