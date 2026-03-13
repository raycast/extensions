import { Form, showToast, Toast, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { useForm, FormValidation, runAppleScript } from "@raycast/utils";
import { useCategories } from "@/hooks";
import { createTimeEntry, type Category } from "@/api";
import { categoryColors } from "@/helpers";
import { useRef } from "react";

interface TimeEntryForm {
  title: string;
  category: string;
  isFromScreen: boolean;
}

interface CreateTimeEntryProps {
  revalidateUser: () => void;
  revalidateDailyActivities: () => void;
}

export const CreateTimeEntry = ({ revalidateUser, revalidateDailyActivities }: CreateTimeEntryProps) => {
  const { pop } = useNavigation();
  const { categories, categoriesGroupByTeam, isLoadingCategories } = useCategories();
  const titleRef = useRef<Form.TextField>(null);

  const { handleSubmit, itemProps, setValue, setValidationError } = useForm<TimeEntryForm>({
    async onSubmit(values) {
      const category = categories?.find((category) => category.id.toString() === values.category) as Category;

      const params = {
        task: {
          title: values.title,
          key: values.title,
          parent_id: category.id,
          team_id: category.team.id,
        },
      };
      try {
        await createTimeEntry(params);
        revalidateUser();
        revalidateDailyActivities();
        showToast(Toast.Style.Success, `Started Time Entry`);
        pop();
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to create Time Entry");
      }
    },
    initialValues: {
      title: "",
      isFromScreen: false,
    },
    validation: {
      title: FormValidation.Required,
      category: FormValidation.Required,
    },
  });

  const getTitleUsingAppleScript = async () => {
    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set windowTitle to name of front window of frontApp
      end tell
    `;
    return await runAppleScript(script);
  };

  const handleCheckboxChange = async (checked: boolean) => {
    if (checked) {
      const title = await getTitleUsingAppleScript();
      setValue("title", title);
      setValidationError("title", null);
    } else {
      titleRef.current?.reset();
    }
  };

  return (
    <Form
      isLoading={isLoadingCategories}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="task title" {...itemProps.title} ref={titleRef} />
      <Form.Checkbox
        id="isFromScreen"
        label="Get the title from the screen you are viewing"
        onChange={handleCheckboxChange}
      />
      {categoriesGroupByTeam && (
        <Form.Dropdown title="Category" {...itemProps.category}>
          {Object.entries(categoriesGroupByTeam).map(([teamName, categories]) => (
            <Form.Dropdown.Section key={teamName} title={teamName}>
              {categories.map((category) => (
                <Form.Dropdown.Item
                  key={category.id}
                  icon={{ source: Icon.Circle, tintColor: categoryColors[category.color - 1] }}
                  value={category.id.toString()}
                  title={category.title}
                />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
};
