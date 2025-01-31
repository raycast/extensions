import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { ColorFormProps, ColorType, PrimitiveColor, TokenColor } from "../types";
import { addColor, updateColor, getColors } from "../utils/storage";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export function ColorForm({ color, onSave, currentView }: ColorFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!color;
  const [colorType, setColorType] = useState<ColorType>(
    color?.type || (currentView === "primitives" ? "primitive" : "token"),
  );
  const [primitives, setPrimitives] = useState<PrimitiveColor[]>([]);

  useEffect(() => {
    async function loadPrimitives() {
      const colors = await getColors();
      setPrimitives(colors.filter((c): c is PrimitiveColor => c.type === "primitive"));
    }
    loadPrimitives();
  }, []);

  async function handleSubmit(values: {
    type: ColorType;
    name: string;
    value?: string;
    lightValue?: string;
    darkValue?: string;
  }) {
    try {
      // Validate name
      if (!values.name.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Name is required",
        });
        return;
      }

      if (values.type === "primitive") {
        if (!values.value?.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid color format",
            message: "Please use hexadecimal format (e.g., #FF0000)",
          });
          return;
        }

        const newPrimitive: PrimitiveColor = {
          id: color?.id || uuidv4(),
          name: values.name,
          value: values.value.toUpperCase(),
          type: "primitive",
        };

        if (isEditing) {
          await updateColor(newPrimitive);
        } else {
          await addColor(newPrimitive);
        }
      } else {
        if (!values.lightValue || !values.darkValue) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Both light and dark values are required for tokens",
          });
          return;
        }

        const newToken: TokenColor = {
          id: color?.id || uuidv4(),
          name: values.name,
          type: "token",
          values: {
            light: values.lightValue,
            dark: values.darkValue,
          },
        };

        if (isEditing) {
          await updateColor(newToken);
        } else {
          await addColor(newToken);
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: isEditing ? "Color updated" : "Color added",
      });

      onSave?.();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to save color",
      });
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Color" : "Add Color"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Color" : "Add Color"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={isEditing ? `Edit ${color?.name}` : `Add a new ${colorType === "primitive" ? "primitive" : "token"}`}
      />

      <Form.Dropdown id="type" value={colorType} onChange={(newValue) => setColorType(newValue as ColorType)}>
        <Form.Dropdown.Item value="primitive" title="Primitive" icon={Icon.Brush} />
        <Form.Dropdown.Item value="token" title="Token" icon={Icon.Book} />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="name"
        title="Name"
        autoFocus
        placeholder={
          colorType === "primitive"
            ? `e.g. Base/White, Brand/Primary, Gray-100`
            : `e.g. Text/Primary, BG/Primary, Border/Primary`
        }
        defaultValue={color?.name}
      />

      {colorType === "primitive" ? (
        <Form.TextField
          id="value"
          title="Value"
          placeholder="#000000"
          defaultValue={color?.type === "primitive" ? color.value : undefined}
        />
      ) : (
        <>
          <Form.Dropdown
            id="lightValue"
            title="Light Mode"
            defaultValue={color?.type === "token" ? color.values.light : undefined}
          >
            {primitives.map((primitive) => (
              <Form.Dropdown.Item
                key={primitive.id}
                value={primitive.value}
                title={primitive.name}
                icon={{
                  source: Icon.CircleFilled,
                  tintColor: { light: primitive.value, dark: primitive.value, adjustContrast: false },
                }}
              />
            ))}
          </Form.Dropdown>

          <Form.Dropdown
            id="darkValue"
            title="Dark Mode"
            defaultValue={color?.type === "token" ? color.values.dark : undefined}
          >
            {primitives.map((primitive) => (
              <Form.Dropdown.Item
                key={primitive.id}
                value={primitive.value}
                title={primitive.name}
                icon={{
                  source: Icon.CircleFilled,
                  tintColor: { light: primitive.value, dark: primitive.value, adjustContrast: false },
                }}
              />
            ))}
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
