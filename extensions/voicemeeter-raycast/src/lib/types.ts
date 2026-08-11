export type TargetKind = "strip" | "bus";

export type MuteBehavior =
  | "optimistic-toggle"
  | "refresh-then-toggle"
  | "explicit-idempotent";

export interface VoicemeeterTarget {
  id: string;
  kind: TargetKind;
  index: number;
  name: string;
  gain: number;
  mute: boolean;
  routes?: boolean[];
  identityKeys: string[];
  deviceIn?: string;
}

export interface VoicemeeterCapabilities {
  connected: boolean;
  edition: "standard" | "banana" | "potato" | "unknown";
  stripCount: number;
  busCount: number;
}

export interface VoicemeeterState {
  connected: boolean;
  capabilities: VoicemeeterCapabilities;
  targets: VoicemeeterTarget[];
  error?: string;
}

export type VolumePrimaryAction = "increase" | "decrease";

export type SectionOrder = "strips-first" | "buses-first";

export interface QuickSettings {
  muteBehavior?: MuteBehavior;
  undoTtlSeconds?: number;
  voicemeeterExecutablePath?: string;
  increaseStep?: number;
  decreaseStep?: number;
  volumePrimaryAction?: VolumePrimaryAction;
  sectionOrder?: SectionOrder;
}

export interface EffectiveSettings {
  muteBehavior: MuteBehavior;
  undoTtlSeconds: number;
  undoTtlMs: number;
  voicemeeterExecutablePath?: string;
  increaseStep: number;
  decreaseStep: number;
  volumePrimaryAction: VolumePrimaryAction;
  sectionOrder: SectionOrder;
}

export type ChangedParameter = "mute" | "gain";

export interface HistoryEntry {
  id: string;
  at: number;
  expiresAt: number;
  targetId: string;
  targetName: string;
  targetKind: TargetKind;
  targetIndex: number;
  parameter: ChangedParameter;
  before: number;
  after: number;
}

export interface ProfileTargetOverride {
  mute?: boolean;
  gain?: number;
}

export interface ProfileDefinition {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  global: ProfileTargetOverride;
  overrides: Record<string, ProfileTargetOverride>;
  routes?: Record<string, boolean[]>;
}

export interface ActionResult {
  ok: boolean;
  skipped?: boolean;
  message: string;
  newMute?: boolean;
}
