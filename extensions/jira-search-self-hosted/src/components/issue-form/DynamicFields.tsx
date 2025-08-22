import React from "react";
import { Form, Icon } from "@raycast/api";
import { JiraField, JiraUser } from "../../types/jira-types";

interface DynamicFieldsProps {
  fields: JiraField[];
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  onUserSearch: (query: string, fieldId: string) => void;
  userSuggestions: JiraUser[];
  currentUser: JiraUser;
}

/**
 * Component for rendering dynamic form fields based on Jira field metadata
 */
export function DynamicFields({ fields, values, onChange, onUserSearch, userSuggestions }: DynamicFieldsProps) {
  if (!fields || fields.length === 0) {
    return null;
  }

  return (
    <>
      {fields.length > 0 && <Form.Separator />}

      {fields.map((field) => {
        // Determine field type from schema
        const fieldType = field.schema?.type;
        const fieldCustom = field.schema?.custom;

        // For user type fields
        if (fieldType === "user" || (field.schema?.custom && field.schema?.custom.includes("userpicker"))) {
          return (
            <Form.Dropdown
              key={field.fieldId}
              id={field.fieldId}
              title={field.name}
              filtering={true}
              isLoading={false}
              onSearchTextChange={(query) => onUserSearch(query, field.fieldId)}
              value={values[field.fieldId] ? (values[field.fieldId] as JiraUser).id || "" : ""}
              onChange={(userId) => {
                // Clear value if selection is empty
                if (!userId) {
                  onChange(field.fieldId, null);
                  return;
                }

                // Find selected user in suggestions list
                const selectedUser = userSuggestions.find((u) => u.id === userId);

                // If found, use the full object, otherwise just the id
                onChange(field.fieldId, selectedUser || { id: userId });
              }}
            >
              <Form.Dropdown.Item key="empty" value="" title="Select user..." icon={Icon.Person} />
              {userSuggestions.map((user) => (
                <Form.Dropdown.Item
                  key={user.id || ""}
                  value={user.id || ""}
                  title={user.displayName || ""}
                  icon={user.avatarUrls?.["48x48"] ? { source: user.avatarUrls["48x48"] } : Icon.Person}
                />
              ))}
            </Form.Dropdown>
          );
        }

        // For select type fields (dropdown)
        else if (field.allowedValues && Array.isArray(field.allowedValues)) {
          return (
            <Form.Dropdown
              key={field.fieldId}
              id={field.fieldId}
              title={field.name}
              value={values[field.fieldId] ? String(values[field.fieldId]) : ""}
              onChange={(value) => onChange(field.fieldId, value)}
            >
              <Form.Dropdown.Item key="empty" value="" title={`Select ${field.name.toLowerCase()}...`} />
              {field.allowedValues.map((option: { id?: string; value?: string; name?: string; iconUrl?: string }) => (
                <Form.Dropdown.Item
                  key={option.id || option.value || ""}
                  value={option.id || option.value || ""}
                  title={option.name || option.value || ""}
                  icon={option.iconUrl ? { source: option.iconUrl } : undefined}
                />
              ))}
            </Form.Dropdown>
          );
        }

        // For date type fields
        else if (
          fieldType === "date" ||
          fieldCustom === "com.atlassian.jira.plugin.system.customfieldtypes:datepicker"
        ) {
          return (
            <Form.DatePicker
              key={field.fieldId}
              id={field.fieldId}
              title={field.name}
              value={values[field.fieldId] ? new Date(values[field.fieldId] as string) : undefined}
              onChange={(date) => onChange(field.fieldId, date ? date.toISOString().split("T")[0] : null)}
            />
          );
        }

        // For text fields (single line)
        else if (fieldType === "string" && !fieldCustom?.includes("textarea")) {
          return (
            <Form.TextField
              key={field.fieldId}
              id={field.fieldId}
              title={field.name}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              value={values[field.fieldId] ? String(values[field.fieldId]) : ""}
              onChange={(value) => onChange(field.fieldId, value)}
            />
          );
        }

        // For text areas (multi-line)
        else if (fieldType === "string" && fieldCustom?.includes("textarea")) {
          return (
            <Form.TextArea
              key={field.fieldId}
              id={field.fieldId}
              title={field.name}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              value={values[field.fieldId] ? String(values[field.fieldId]) : ""}
              onChange={(value) => onChange(field.fieldId, value)}
            />
          );
        }

        // For number fields
        else if (fieldType === "number") {
          return (
            <Form.TextField
              key={field.fieldId}
              id={field.fieldId}
              title={field.name}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              value={values[field.fieldId] ? String(values[field.fieldId]) : ""}
              onChange={(value) => onChange(field.fieldId, value ? parseFloat(value) : null)}
            />
          );
        }

        // For array fields (multi-select)
        else if (fieldType === "array") {
          // If it's a user array
          if (field.schema?.items === "user") {
            return (
              <Form.TagPicker
                key={field.fieldId}
                id={field.fieldId}
                title={field.name}
                placeholder={`Select ${field.name.toLowerCase()}`}
                value={
                  Array.isArray(values[field.fieldId])
                    ? (values[field.fieldId] as JiraUser[]).map((u) => u.id || "")
                    : []
                }
                onChange={(selectedIds) => {
                  const selectedUsers = selectedIds.map((id) => userSuggestions.find((u) => u.id === id) || { id });
                  onChange(field.fieldId, selectedUsers);
                }}
              >
                {userSuggestions.map((user) => (
                  <Form.TagPicker.Item
                    key={user.id || ""}
                    value={user.id || ""}
                    title={user.displayName || ""}
                    icon={user.avatarUrls?.["48x48"] ? { source: user.avatarUrls["48x48"] } : Icon.Person}
                  />
                ))}
              </Form.TagPicker>
            );
          }
          // Default array handling
          return (
            <Form.Description
              key={field.fieldId}
              title={field.name}
              text={`Field type '${fieldType}' with items '${field.schema?.items}' is not supported yet`}
            />
          );
        }

        // Default for unsupported field types
        return (
          <Form.Description
            key={field.fieldId}
            title={field.name}
            text={`Field type '${fieldType}' is not supported yet`}
          />
        );
      })}
    </>
  );
}
