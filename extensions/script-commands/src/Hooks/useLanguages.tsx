import { useDataManager } from "@hooks";

import { Language } from "@models";

type UseLanguages = () => {
  languages: Language[];
};

export const useLanguages: UseLanguages = () => {
  const { dataManager } = useDataManager();

  return {
    languages: dataManager.fetchLanguages(),
  };
};
