import { LocalStorage } from '@raycast/api';

export interface Parameters {
  model: string;
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
}

const penaltyValidation = (type: 'presence_penalty' | 'frequency_penalty') => {
  return (value: string | undefined) => {
    if (!value) {
      return `\`${type}\` is required`;
    }
    const valueInNumber = parseFloat(value);
    if (isNaN(valueInNumber) || valueInNumber < -2 || valueInNumber > 2) {
      return `\`${type}\` must be a number between -2.0 and 2.0`;
    }
  };
};

export const PARAMETERS = {
  model: {
    title: 'Model',
    description:
      "gpt-3.5-turbo: Most capable GPT-3.5 model and optimized for chat at 1/10th the cost of `text-davinci-003`. Will be updated with OpenAI's latest model iteration.\n\ngpt-3.5-turbo-0301: Snapshot of `gpt-3.5-turbo` from March 1st 2023. Unlike `gpt-3.5-turbo`, this model will not receive updates, and will only be supported for a three month period ending on June 1st 2023.\n\ntext-davinci-003: Can do any language task with better quality, longer output, and consistent instruction-following than the curie, babbage, or ada models.\n\ntext-davinci-002: Similar capabilities to `text-davinci-003` but trained with supervised fine-tuning instead of reinforcement learning",
    required: false,
    data: ['gpt-3.5-turbo', 'gpt-3.5-turbo-0301', 'text-davinci-003', 'text-davinci-002'],
    default: 'gpt-3.5-turbo',
  },
  temperature: {
    title: 'Temperature',
    description:
      'What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.\n\nWe generally recommend altering this or `top_p` but not both.',
    default: 0,
    validation: (value: string | undefined) => {
      if (!value) {
        return '`temperature` is required'; // TODO: consider fallback to default instead of erroring
      }
      const valueInNumber = parseFloat(value);
      if (isNaN(valueInNumber) || valueInNumber < 0 || valueInNumber > 2) {
        return '`temperature` must be a number between 0 and 2';
      }
    },
  },
  top_p: {
    title: 'top_p',
    description:
      'An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.\n\nWe generally recommend altering this or `temperature` but not both.',
    default: 1,
    validation: (value: string | undefined) => {
      if (!value) {
        return '`top_p` is required'; // TODO: consider fallback to default instead of erroring
      }
      if (isNaN(parseFloat(value))) {
        return '`top_p` must be a number';
      }
    },
  },
  presence_penalty: {
    title: 'Presence Penalty',
    description:
      "Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.",
    default: 1,
    validation: penaltyValidation('presence_penalty'),
  },
  frequency_penalty: {
    title: 'Frequency Penalty',
    description:
      "Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.",
    default: 1,
    validation: penaltyValidation('frequency_penalty'),
  },
};

type PreferenceKeys = 'model' | 'temperature' | 'top_p' | 'presence_penalty' | 'frequency_penalty';

export const getParamFromLocalStorage = async (key: PreferenceKeys) => {
  return (await LocalStorage.getItem(key)) || PARAMETERS[key].default;
};

export const getAllParamsFromLocalStorage = async () => {
  return {
    model: (await LocalStorage.getItem<string>('model')) || PARAMETERS.model.default,
    temperature: (await LocalStorage.getItem<number>('temperature')) || PARAMETERS.temperature.default,
    top_p: (await LocalStorage.getItem<number>('top_p')) || PARAMETERS.top_p.default,
    presence_penalty: (await LocalStorage.getItem<number>('presence_penalty')) || PARAMETERS.presence_penalty.default,
    frequency_penalty:
      (await LocalStorage.getItem<number>('frequency_penalty')) || PARAMETERS.frequency_penalty.default,
  };
};

export const saveParamsToLocalStorage = async (params: Parameters) => {
  for (const [key, value] of Object.entries(params)) {
    await LocalStorage.setItem(key, value);
  }
};
