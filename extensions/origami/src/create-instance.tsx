import {
  Action,
  ActionPanel,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useEntities } from "./hooks/useEntities";
import { useEntityStructure } from "./hooks/useEntityStructure";
import { useUsers } from "./hooks/useUsers";
import { createInstance, FieldData, FormData, UserData } from "./services/instanceService";

/**
 * First step form that allows user to select an entity
 */
function EntitySelectionForm() {
  const [selectedEntity, setSelectedEntity] = useCachedState<string>("create-instance-selected-entity", "");
  const { data: entitiesResponse, isLoading: isLoadingEntities } = useEntities();
  const { push } = useNavigation();

  // Ensure entities is always an array
  const entities = Array.isArray(entitiesResponse) ? entitiesResponse : [];
  const nonProtectedEntities = entities.filter((entity) => entity.protected_entity === "0");

  const handleSubmit = (values: { entity: string }) => {
    push(<InstanceCreationForm entityDataName={values.entity} />);
  };

  // Auto-select first entity if only one is available
  useEffect(() => {
    if (nonProtectedEntities.length === 1 && selectedEntity === "" && !isLoadingEntities) {
      setSelectedEntity(nonProtectedEntities[0].entity_data_name);
    }
  }, [nonProtectedEntities, isLoadingEntities, selectedEntity, setSelectedEntity]);

  return (
    <Form
      isLoading={isLoadingEntities}
      navigationTitle="Select Entity"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Continue" icon={Icon.ArrowRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="entity"
        title="Entity"
        info="Select the entity in which to create a new instance"
        value={selectedEntity}
        onChange={setSelectedEntity}
      >
        {nonProtectedEntities.map((entity) => (
          <Form.Dropdown.Item
            key={entity.entity_data_name}
            value={entity.entity_data_name}
            title={entity.entity_name}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

interface FieldOption {
  title: string;
  value: string;
}

/**
 * Form for creating a new instance with fields based on entity structure
 */
function InstanceCreationForm({ entityDataName }: { entityDataName: string }) {
  const { data: entityStructure, isLoading: isLoadingStructure } = useEntityStructure(entityDataName);
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Setup validation rules based on entity structure
  const [validationRules, setValidationRules] = useState<Record<string, FormValidation>>({});

  // Generate validation rules when entity structure is loaded
  useEffect(() => {
    if (entityStructure) {
      const rules: Record<string, FormValidation> = {};

      entityStructure.instance_data.forEach((group) => {
        group.fields_data.forEach((field) => {
          const isRequired = field.required === 1 || field.required === "1";
          if (isRequired) {
            rules[field.field_data_name] = FormValidation.Required;
          }
        });
      });

      setValidationRules(rules);
    }
  }, [entityStructure]);

  // Use the useForm hook with proper validation
  const { handleSubmit, itemProps, values } = useForm({
    onSubmit: async (formValues) => {
      await submitForm(formValues);
    },
    validation: validationRules,
    // Initialize all form fields with empty values
    initialValues: (() => {
      // Create a map of all field IDs with empty initial values
      const initialValues: Record<string, unknown> = {};

      if (entityStructure) {
        entityStructure.instance_data.forEach((group) => {
          group.fields_data.forEach((field) => {
            // Set appropriate empty value based on field type
            switch (field.field_type_name) {
              case "multi-value-select-box":
              case "assign-field":
                initialValues[field.field_data_name] = [];
                break;
              case "input-datetime":
                // Leave as undefined for date fields
                break;
              case "input-checkbox-singel":
                // Convert default value "0" or "1" to boolean
                initialValues[field.field_data_name] = field.default_value === "1";
                break;
              default:
                initialValues[field.field_data_name] = "";
            }
          });
        });
      }

      return initialValues;
    })(),
  });

  // Parse possible values for dropdown fields
  const getPossibleValues = (possibleValuesStr: string | undefined): FieldOption[] => {
    if (!possibleValuesStr) return [];

    const parsed = JSON.parse(possibleValuesStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => {
      if (typeof item === "object" && item.title && item.value) {
        return { title: item.title, value: item.value };
      }
      return { title: String(item), value: String(item) };
    });
  };

  // Format field value based on field type before submission
  const formatFieldValue = (
    value: unknown,
    fieldType: string,
  ): string | number | UserData | UserData[] | string[] | { timestamp: number; text: string } | undefined => {
    if (value === undefined || value === null || value === "") return undefined;

    switch (fieldType) {
      case "assign-field": {
        if (!users || users.length === 0) return undefined;

        // Handle array of selected user text values
        const selectedUserTexts = Array.isArray(value) ? value : [value as string];
        if (selectedUserTexts.length === 0) return undefined;

        // Find all selected users by text
        const selectedUsers = selectedUserTexts
          .map((userText) => users.find((user) => user.text === userText))
          .filter((user): user is UserData => user !== undefined);

        return selectedUsers;
      }

      case "user-field": {
        if (!users || users.length === 0) return undefined;

        // Find the selected user by text
        const selectedUserText = value as string;
        const selectedUser = users.find((user) => user.text === selectedUserText);
        if (!selectedUser) return undefined;

        return selectedUser;
      }

      case "input-checkbox-singel":
        // Convert boolean value to "0" or "1" string
        return value === true || value === "true" || value === "1" ? "1" : "0";

      case "multi-value-select-box":
        return value as string[];

      case "input-datetime":
        if (value instanceof Date) {
          const timestamp = Math.floor(value.getTime() / 1000);
          const text = value.toLocaleString();
          return { timestamp, text };
        }
        return value as { timestamp: number; text: string };

      default:
        if (typeof value === "string") return value;
        if (typeof value === "number") return value;
        return String(value);
    }
  };

  const submitForm = async (formValues: Record<string, unknown>) => {
    if (!entityStructure) return;

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating instance...",
    });

    try {
      // Prepare form data for submission
      const formData: FormData[] = entityStructure.instance_data.map((groupData) => {
        const fieldValues: FieldData = {};

        // Process each field in the group
        groupData.fields_data.forEach((field) => {
          if (field.field_type_name === "metadata-field") return;

          const value = formatFieldValue(formValues[field.field_data_name], field.field_type_name);

          if (value !== undefined) {
            fieldValues[field.field_data_name] = value;
          }
        });

        return {
          group_data_name: groupData.field_group_data.group_data_name,
          data: [fieldValues],
        };
      });

      const filteredFormData = formData.filter((group) => Object.keys(group.data[0]).length > 0);

      const response = await createInstance(entityDataName, filteredFormData);

      if (response.success === "ok") {
        toast.style = Toast.Style.Success;
        toast.title = "Instance created successfully";
        setTimeout(() => {
          launchCommand({
            name: "view-instances",
            type: LaunchType.UserInitiated,
            context: { entity: entityDataName },
          });
        }, 1000);
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create instance";
        toast.message = response.message || "Unknown error occurred.";
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create instance";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred.";
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render appropriate form field based on field type
  const renderFormField = (field: {
    required: number | string;
    field_data_name: string;
    field_name: string;
    field_type_name: string;
    placeholder: string | null;
    tooltip_description: string;
    possible_values?: string;
    custom_validation: {
      start_from?: string;
      to_end?: string;
      interval?: string;
      unable_to_edit: string;
    };
  }) => {
    const key = field.field_data_name;
    const info = field.tooltip_description;
    const placeholder = field.placeholder || "";

    // Get the itemProps for this field
    const fieldProps = itemProps[key];

    switch (field.field_type_name) {
      // Text input fields
      case "input-address":
      case "input-email":
      case "input-link":
      case "input-telephone":
      case "input-text":
        return (
          <Form.TextField
            key={key}
            id={key}
            title={field.field_name}
            placeholder={placeholder}
            info={info}
            error={fieldProps?.error}
            onChange={fieldProps?.onChange}
            onBlur={fieldProps?.onBlur}
            value={(values[key] as string) || ""}
          />
        );

      case "input-area":
        return (
          <Form.TextArea
            key={key}
            id={key}
            title={field.field_name}
            placeholder={placeholder}
            info={info}
            error={fieldProps?.error}
            onChange={fieldProps?.onChange}
            onBlur={fieldProps?.onBlur}
            value={(values[key] as string) || ""}
          />
        );

      case "input-password":
        return (
          <Form.PasswordField
            key={key}
            id={key}
            title={field.field_name}
            placeholder={placeholder}
            info={info}
            error={fieldProps?.error}
            onChange={fieldProps?.onChange}
            onBlur={fieldProps?.onBlur}
            value={(values[key] as string) || ""}
          />
        );

      // User selection fields
      case "assign-field":
        return (
          <Form.TagPicker
            key={key}
            id={key}
            title={field.field_name}
            info={info}
            error={fieldProps?.error}
            onChange={fieldProps?.onChange}
            onBlur={fieldProps?.onBlur}
            value={(values[key] as string[]) || []}
          >
            {users?.map((user: UserData) => (
              <Form.TagPicker.Item key={user.instance_id} value={user.text} title={user.text} icon={Icon.Person} />
            ))}
          </Form.TagPicker>
        );

      case "user-field":
        return (
          <Form.Dropdown
            key={key}
            id={key}
            title={field.field_name}
            info={info}
            error={fieldProps?.error}
            onChange={fieldProps?.onChange}
            onBlur={fieldProps?.onBlur}
            value={(values[key] as string) || ""}
            isLoading={isLoadingUsers}
          >
            <Form.Dropdown.Item key="empty" value="" title="-" />
            {users?.map((user: UserData) => (
              <Form.Dropdown.Item key={user.instance_id} value={user.text} title={user.text} />
            ))}
          </Form.Dropdown>
        );

      // Dropdown fields
      case "select-from-numbers-range":
      case "slider-selector": {
        // Parse the range parameters from custom_validation
        const startFrom = parseInt(field.custom_validation?.start_from || "0", 10);
        const toEnd = parseInt(field.custom_validation?.to_end || "0", 10);
        const interval = parseInt(field.custom_validation?.interval || "1", 10);

        // Generate array of numbers based on range and interval
        const numbers: number[] = [];
        for (let i = startFrom; i <= toEnd; i += interval) {
          numbers.push(i);
        }

        return (
          <Form.Dropdown
            key={key}
            id={key}
            title={field.field_name}
            info={info}
            error={fieldProps?.error}
            onChange={fieldProps?.onChange}
            onBlur={fieldProps?.onBlur}
            value={(values[key] as string) || ""}
          >
            <Form.Dropdown.Item key="empty" value="" title="–" />
            {numbers.map((num) => (
              <Form.Dropdown.Item key={num} value={num.toString()} title={num.toString()} />
            ))}
          </Form.Dropdown>
        );
      }

      case "select-list": {
        const options = getPossibleValues(field.possible_values);
        return (
          <Form.Dropdown
            key={key}
            id={key}
            title={field.field_name}
            info={info}
            error={fieldProps?.error}
            onChange={fieldProps?.onChange}
            onBlur={fieldProps?.onBlur}
            value={(values[key] as string) || ""}
          >
            <Form.Dropdown.Item key="empty" value="" title="–" />
            {options.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.Dropdown>
        );
      }

      // Other specialized fields
      case "input-checkbox-singel":
        // For checkbox, convert default value from "0"/"1" to boolean
        return (
          <Form.Checkbox
            key={key}
            id={key}
            label=""
            title={field.field_name}
            info={info}
            error={fieldProps?.error}
            onChange={fieldProps?.onChange}
            onBlur={fieldProps?.onBlur}
            value={values[key] === true || values[key] === "1" || values[key] === "true"}
          />
        );

      case "input-datetime":
        return (
          <Form.DatePicker
            key={key}
            id={key}
            title={field.field_name}
            info={info}
            error={fieldProps?.error}
            onChange={fieldProps?.onChange}
            onBlur={fieldProps?.onBlur}
            value={(values[key] as Date) || null}
          />
        );

      case "multi-value-select-box": {
        const tagOptions = getPossibleValues(field.possible_values);
        return (
          <Form.TagPicker
            key={key}
            id={key}
            title={field.field_name}
            info={info}
            error={fieldProps?.error}
            onChange={fieldProps?.onChange}
            onBlur={fieldProps?.onBlur}
            value={(values[key] as string[]) || []}
          >
            {tagOptions.map((option) => (
              <Form.TagPicker.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.TagPicker>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Form
      isLoading={isLoadingStructure || isLoadingUsers || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Instance" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {entityStructure?.instance_data?.flatMap((group, groupIndex) => {
        const fields = group.fields_data;
        if (fields.length === 0) return [];

        // Create an array with group title and fields
        const groupElements = [
          // Group title with uppercase text
          <Form.Description
            key={`title-${group.field_group_data.group_data_name}`}
            title={group.field_group_data.group_name.toUpperCase()}
            text=""
          />,

          // Fields
          ...fields.map((field) => renderFormField(field)),

          // Add separator only if it's not the last group
          ...(groupIndex < entityStructure.instance_data.length - 1
            ? [<Form.Separator key={`sep-${group.field_group_data.group_data_name}`} />]
            : []),
        ];

        return groupElements;
      })}
    </Form>
  );
}

/**
 * Main command component that shows the entity selection form
 */
export default function Command() {
  return <EntitySelectionForm />;
}
