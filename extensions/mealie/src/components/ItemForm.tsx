import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAllUnits } from "../api/units";
import type { MealieClient } from "../api/client";
import type { ItemChanges } from "../api/shopping";
import type { IngredientUnit, LabelSetting, ShoppingListItem } from "../types";

const NONE = "__none__";

interface Props {
  client: MealieClient;
  item: ShoppingListItem;
  labelSettings: LabelSetting[];
  onSubmit: (changes: ItemChanges) => Promise<void>;
}

export function ItemForm({ client, item, labelSettings, onSubmit }: Props) {
  const { pop } = useNavigation();
  const { data: units, isLoading } = useCachedPromise(() => getAllUnits(client), [], {
    initialData: [] as IngredientUnit[],
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Edit Item"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Item"
            onSubmit={async (values: { quantity: string; unitId: string; note: string; labelId: string }) => {
              const quantity = Number.parseFloat(values.quantity.replace(",", "."));
              await onSubmit({
                quantity: Number.isFinite(quantity) ? quantity : item.quantity,
                note: values.note,
                unitId: values.unitId === NONE ? null : values.unitId,
                labelId: values.labelId === NONE ? null : values.labelId,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="quantity" title="Quantity" defaultValue={String(item.quantity ?? 0)} />
      <Form.Dropdown id="unitId" title="Unit" defaultValue={item.unitId ?? NONE}>
        <Form.Dropdown.Item value={NONE} title="No unit" />
        {units.map((unit) => (
          <Form.Dropdown.Item key={unit.id} value={unit.id} title={unit.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="note" title="Note" defaultValue={item.note ?? ""} />
      <Form.Dropdown id="labelId" title="Label" defaultValue={item.labelId ?? NONE}>
        <Form.Dropdown.Item value={NONE} title="No label" />
        {labelSettings.map((setting) => (
          <Form.Dropdown.Item key={setting.labelId} value={setting.labelId} title={setting.label.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
