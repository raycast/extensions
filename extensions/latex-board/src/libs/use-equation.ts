import { Color, LocalStorage } from "@raycast/api";
import { EquationFormValues } from "../create-equation-metadata";
import { DUPLICATE_SUFFIX } from "../core/constants";

export type ColorKey = Exclude<keyof typeof Color, "Dynamic">;
export type ColorValue = (typeof Color)[ColorKey];

export type EquationObj = {
  id: string;
  title: string;
  latex: string;
  tags: ColorValue[];
  favorite: boolean;
};

/**
 * A hook for managing Equations.
 *
 * @returns
 *   - fetchEquations: Function to fetch the list of equations.
 *   - createEquation: Function to create a new equation.
 *   - duplicateEquation: Function to duplicate an equation by its ID.
 *   - editEquation: Function to edit an equation by its ID.
 *   - favoriteEquation: Function to favorite/unfavorite an equation by its ID.
 *   - deleteEquation: Function to delete an equation by its ID.
 *   - deleteAllEquations: Function to delete all equations.
 */
export const useEquation = () => {
  /**
   * fetch the list of equations from local storage.
   */
  const fetchEquations = async (): Promise<EquationObj[]> => {
    const equations = await LocalStorage.getItem<string>("equations");

    if (!equations) return [];

    return JSON.parse(equations);
  };

  /**
   * create a new equation and save it to local storage.
   * @param equation - The equation values.
   */
  const createEquation = async (equation: EquationFormValues): Promise<void> => {
    const equations = await fetchEquations();

    const { title, latex, tags } = equation;

    // Generate a random ID
    const newId = Date.now()
      .toString()
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");

    const newEquation: EquationObj = {
      id: newId,
      title,
      latex,
      tags,
      favorite: false,
    };

    const updatedEquations = [...equations, newEquation];

    await saveEquationsToLocalStorage(updatedEquations);
  };

  /**
   * duplicate an equation by its ID.
   * @param id - The ID of the equation to duplicate.
   */
  const duplicateEquation = async (id: string): Promise<void> => {
    const equations = await fetchEquations();

    const targetEquation = equations.find((eq) => eq.id === id) as EquationObj;

    // Generate a random ID
    const newId = Date.now()
      .toString()
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");

    const newEquation: EquationObj = {
      ...targetEquation,
      id: newId,
      title: `${targetEquation.title}${DUPLICATE_SUFFIX}`,
      favorite: false,
    };

    const updatedEquations = [...equations, newEquation];

    await saveEquationsToLocalStorage(updatedEquations);
  };

  /**
   * edit an equation by its ID.
   * @param id - The ID of the equation to edit.
   * @param equation - The new equation values.
   */
  const editEquation = async (id: string, equation: EquationFormValues): Promise<void> => {
    const equations = await fetchEquations();

    const targetEquation = equations.find((eq) => eq.id === id) as EquationObj;

    const { title, latex, tags } = equation;

    const newEquation: EquationObj = {
      ...targetEquation,
      title,
      latex,
      tags,
    };

    const updatedEquations = equations.map((eq) => (eq.id === id ? newEquation : eq));

    await saveEquationsToLocalStorage(updatedEquations);
  };

  /**
   * favorite an equation by its ID.
   * @param id - The ID of the equation to favorite.
   */
  const favoriteEquation = async (id: string): Promise<void> => {
    const equations = await fetchEquations();

    const targetEquation = equations.find((eq) => eq.id === id) as EquationObj;

    const newEquation: EquationObj = {
      ...targetEquation,
      favorite: !targetEquation.favorite,
    };

    const updatedEquations = equations.map((eq) => (eq.id === id ? newEquation : eq));

    await saveEquationsToLocalStorage(updatedEquations);
  };

  /**
   * delete an equation by its ID.
   * @param id - The ID of the equation to delete.
   */
  const deleteEquation = async (id: string): Promise<void> => {
    const equations = await fetchEquations();
    const updatedEquations = equations.filter((eq) => eq.id !== id);

    await saveEquationsToLocalStorage(updatedEquations);
  };

  /**
   * delete all equations.
   */
  const deleteAllEquations = async (): Promise<void> => {
    await LocalStorage.removeItem("equations");
  };

  return {
    fetchEquations,
    createEquation,
    duplicateEquation,
    editEquation,
    favoriteEquation,
    deleteEquation,
    deleteAllEquations,
  };
};

const saveEquationsToLocalStorage = async (equations: EquationObj[]) => {
  await LocalStorage.setItem("equations", JSON.stringify(equations));
};
