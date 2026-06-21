import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { PLACEMENT_OPTIONS } from "../placements";
import { findLayoutByName, getLayouts, upsertLayout } from "../storage";
import { LayoutFormValues, LayoutPreset } from "../types";

type Props = {
  layout?: LayoutPreset;
  onSave?: () => void;
  returnToListAfterSave?: boolean;
};

export function LayoutForm({ layout, onSave, returnToListAfterSave = false }: Props) {
  const { pop } = useNavigation();
  const isEditing = Boolean(layout?.id);

  async function handleSubmit(values: LayoutFormValues) {
    const name = values.name.trim();
    const widthPercentage = Number(values.widthPercentage);
    const heightPercentage = Number(values.heightPercentage);
    const placement = values.placement ?? "center";

    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Name the layout first" });
      return;
    }

    if (!isValidPercentage(widthPercentage) || !isValidPercentage(heightPercentage)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Use percentages from 1 to 100",
        message: "Width and height are based on the window's current monitor.",
      });
      return;
    }

    const layouts = await getLayouts();
    const existingLayout = findLayoutByName(layouts, name);

    if (existingLayout && existingLayout.id !== layout?.id) {
      await showToast({
        style: Toast.Style.Failure,
        title: "A layout with this name already exists",
        message: "Pick a unique name so the layout list stays clean.",
      });
      return;
    }

    const now = new Date().toISOString();
    await upsertLayout({
      id: layout?.id || randomUUID(),
      name,
      widthPercentage,
      heightPercentage,
      placement,
      commandName: layout?.commandName,
      isBuiltIn: layout?.isBuiltIn,
      isDisabledByDefault: layout?.isDisabledByDefault,
      createdAt: layout?.createdAt || now,
      updatedAt: now,
    });

    onSave?.();

    if (isEditing || returnToListAfterSave) {
      await showToast({
        style: Toast.Style.Success,
        title: isEditing ? "Layout Updated" : "Layout Created",
        message: `${name} is ready to run.`,
      });
      pop();
      return;
    }

    await closeMainWindow({ clearRootSearch: true });
    await showHUD(`${name} saved`);
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Window Layout" : "Create Window Layout"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Save Window Layout"}
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Set the focused window as a percentage of its current monitor." />
      <Form.TextField id="name" title="Name" placeholder="Reading, Writing, Focus" defaultValue={layout?.name} />
      <Form.TextField
        id="widthPercentage"
        title="Width"
        placeholder="70"
        defaultValue={String(layout?.widthPercentage ?? 70)}
      />
      <Form.TextField
        id="heightPercentage"
        title="Height"
        placeholder="85"
        defaultValue={String(layout?.heightPercentage ?? 85)}
      />
      <Form.Dropdown id="placement" title="Placement" defaultValue={layout?.placement ?? "center"}>
        {PLACEMENT_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function isValidPercentage(value: number) {
  return Number.isFinite(value) && value > 0 && value <= 100;
}
