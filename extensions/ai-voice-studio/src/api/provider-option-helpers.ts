interface VoiceConfig {
  name: string;
}

interface ValidateVoiceOptions<TModel extends string, TVoice extends VoiceConfig> {
  getVoiceById: (voiceId: string) => TVoice | undefined;
  isVoiceAvailableForModel: (voice: TVoice, model: TModel) => boolean;
  model: TModel;
  modelLabel: string;
  providerName: string;
  throwConfigError: (message: string) => never;
  voice: string;
}

export function validateVoiceForModel<TModel extends string, TVoice extends VoiceConfig>({
  getVoiceById,
  isVoiceAvailableForModel,
  model,
  modelLabel,
  providerName,
  throwConfigError,
  voice,
}: ValidateVoiceOptions<TModel, TVoice>): TVoice {
  const voiceConfig = getVoiceById(voice);
  if (voiceConfig === undefined) {
    throwConfigError(
      `Unknown voice "${voice}". Pick a ${providerName} voice in Setup Voice Defaults or Set Quick Read Voice.`,
    );
    throw new Error("Unreachable voice validation failure");
  }

  if (!isVoiceAvailableForModel(voiceConfig, model)) {
    throwConfigError(
      `${voiceConfig.name} is not available for ${modelLabel}. Change the model or choose another voice.`,
    );
  }

  return voiceConfig;
}

export function resolvePlaybackRate(
  speedOverrideRate: number | null | undefined,
  configuredRate: string | undefined,
  parseRateString: (rate: string | undefined) => number,
): number {
  return typeof speedOverrideRate === "number" ? speedOverrideRate : parseRateString(configuredRate);
}
