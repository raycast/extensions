import { Form } from "@raycast/api";
import type { CustomDrink } from "../types";
import { BUILT_IN_PRESETS, caffeineForVolume, getDrinkPresets, OTHER_OPTION } from "../utils/drinkPresets";
import { positiveAmount } from "../utils/intakeData";

export interface DrinkSelection {
  id: string;
  volume: string;
  caffeine: string;
}

export function selectDrink(id = BUILT_IN_PRESETS[0].id, customDrinks?: CustomDrink[]): DrinkSelection {
  const preset = getDrinkPresets(customDrinks).find((drink) => drink.id === id);
  return {
    id,
    volume: preset?.servingMl?.toString() ?? "",
    caffeine: preset?.defaultCaffeineMg.toString() ?? "",
  };
}

export function DrinkFields({
  selection,
  customDrinks,
  onChange,
}: {
  selection: DrinkSelection;
  customDrinks?: CustomDrink[];
  onChange: (selection: DrinkSelection) => void;
}) {
  const preset = getDrinkPresets(customDrinks).find(({ id }) => id === selection.id);

  function changeVolume(volume: string) {
    const ml = positiveAmount(volume);
    const caffeine = preset && ml ? caffeineForVolume(preset, ml) : undefined;
    onChange({ ...selection, volume, caffeine: caffeine?.toString() ?? "" });
  }

  return (
    <>
      <Form.Dropdown
        id="drinkType"
        title="Drink"
        value={selection.id}
        onChange={(id) => onChange(selectDrink(id, customDrinks))}
      >
        <Form.Dropdown.Section title="Built-in Presets">
          {BUILT_IN_PRESETS.map(({ id, name }) => (
            <Form.Dropdown.Item key={id} title={name} value={id} />
          ))}
        </Form.Dropdown.Section>
        {!!customDrinks?.length && (
          <Form.Dropdown.Section title="Custom Drinks">
            {customDrinks.map(({ id, name }) => (
              <Form.Dropdown.Item key={id} title={name} value={id} />
            ))}
          </Form.Dropdown.Section>
        )}
        <Form.Dropdown.Item title="Other" value={OTHER_OPTION} />
      </Form.Dropdown>
      {preset?.servingMl !== undefined && (
        <Form.TextField
          id="volume"
          title="Serving (mL)"
          placeholder="e.g. 240"
          value={selection.volume}
          onChange={changeVolume}
        />
      )}
      <Form.TextField
        id="caffeine"
        title="Caffeine (mg)"
        placeholder="e.g. 95"
        value={selection.caffeine}
        onChange={(caffeine) => onChange({ ...selection, caffeine })}
        info="Preset amounts are estimates. Enter the caffeine on the label when you know it."
      />
    </>
  );
}
