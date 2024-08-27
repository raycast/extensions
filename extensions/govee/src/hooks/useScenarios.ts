import { nanoid } from "nanoid";

import type { Scenario, ScenarioData, ScenariosHook } from "@/types";

import useLocalStorage from "@/hooks/useLocalStorage";

const useScenarios = (): ScenariosHook => {
  const { data, setData, isLoading } = useLocalStorage<Scenario[]>("scenarios", []);

  const createScenario = (data: ScenarioData) => {
    const id = nanoid();
    setData((scenarios) => [...scenarios, { id, ...data }]);
    return id;
  };

  const updateScenario = (id: string, data: ScenarioData) => {
    setData((scenarios) => scenarios.map((scenario) => (scenario.id === id ? { id, ...data } : scenario)));
  };

  const deleteScenario = (id: string) => {
    setData((scenarios) => scenarios.filter((scenario) => scenario.id !== id));
  };

  const duplicateScenario = (id: string) => {
    const scenario = getScenario(id)!;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...rest } = scenario;
    return createScenario({ ...rest, title: `${scenario.title} (Copy)` });
  };

  const getScenario = (id: string) => (data || []).find((scenario) => scenario.id === id);

  return {
    scenarios: data || [],
    getScenario,
    createScenario,
    updateScenario,
    deleteScenario,
    duplicateScenario,
    isLoading,
  };
};

export default useScenarios;
