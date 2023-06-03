import { LocalStorage, showToast, Toast } from '@raycast/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Model, ModelHook } from '../type';

export const PromptCollection = {
  improve: `You are an assistant that revises a user's document to improve its writing quality.

	Make sure to:
	
	- Fix spelling and grammar
	- Make sentences more clear and concise
	- Split up run-on sentences
	- Reduce repetition
	- When replacing words, do not make them more complex or difficult than the original
	- If the text contains quotes, repeat the text inside the quotes verbatim
	- Do not change the meaning of the text
	- Do not remove any markdown formatting in the text, like headers, bullets, or checkboxes
	- Do not use overly formal language
	
	Output in markdown format.
	First, detect the language of the document. If the language is not clear, use English.
	Then, output using the detected language`,
  summarize: `
	You are an assistant helping summarize a document. Use this format, replacing text in brackets with the result. Do not include the brackets in the output: 
	
	Summary in [Identified language of the document]: 
	
	[One-paragaph summary of the document using the identified language.].
	 `,
};

export const DEFAULT_MODEL: Model = {
  id: 'default',
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: 'Default',
  prompt: PromptCollection.improve,
  option: 'gpt-3.5-turbo',
  temperature: 1,
  pinned: false,
};

export const SUMMARY_MODEL: Model = {
  ...DEFAULT_MODEL,
  prompt: PromptCollection.summarize,
};

export function useModel(): ModelHook {
  const [data, setData] = useState<Model[]>([]);
  const [isLoading, setLoading] = useState<boolean>(false);

  const option: Model['option'][] = ['gpt-3.5-turbo', 'gpt-3.5-turbo-0301'];

  useEffect(() => {
    (async () => {
      setLoading(true);
      const storedModels = await LocalStorage.getItem<string>('models');

      if (!storedModels) {
        setData([DEFAULT_MODEL]);
      } else {
        setData((previous) => [...previous, ...JSON.parse(storedModels)]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem('models', JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: 'Saving your model...',
        style: Toast.Style.Animated,
      });
      const newModel: Model = { ...model, created_at: new Date().toISOString() };
      setData([...data, newModel]);
      toast.title = 'Model saved!';
      toast.style = Toast.Style.Success;
    },
    [setData, data]
  );

  const update = useCallback(
    async (model: Model) => {
      setData((prev) => {
        return prev.map((x) => {
          if (x.id === model.id) {
            return model;
          }
          return x;
        });
      });
    },
    [setData, data]
  );

  const remove = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: 'Remove your model...',
        style: Toast.Style.Animated,
      });
      const newModels: Model[] = data.filter((oldModel) => oldModel.id !== model.id);
      setData(newModels);
      toast.title = 'Model removed!';
      toast.style = Toast.Style.Success;
    },
    [setData, data]
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: 'Clearing your models ...',
      style: Toast.Style.Animated,
    });
    const newModels: Model[] = data.filter((oldModel) => oldModel.id === DEFAULT_MODEL.id);
    setData(newModels);
    toast.title = 'Models cleared!';
    toast.style = Toast.Style.Success;
  }, [setData]);

  return useMemo(
    () => ({ data, isLoading, option, add, update, remove, clear }),
    [data, isLoading, option, add, update, remove, clear]
  );
}
