import { Color, List } from "@raycast/api";
import React from "react";
import { getDisplayText } from "../services/displayService";
import { DateTimeFieldValue, FieldGroup, UserFieldValue } from "../types";

/**
 * Determines if a field type can be rendered
 * Add new unsupported field types here with explanatory comments
 */
function isFieldTypeSupported(fieldTypeName: string): boolean {
  const unsupportedFieldTypes = new Set(["select-from-entity", "wysiwyg", "input-password"]);

  return !unsupportedFieldTypes.has(fieldTypeName);
}

/**
 * Renders detailed metadata for an instance
 * Displays all field groups and their fields in a single metadata view
 * Groups are separated by separators and labeled with uppercase headers
 */
export function InstanceDetail({ fieldGroups }: { fieldGroups: FieldGroup[] }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {fieldGroups.map((fieldGroup, groupIndex) => {
            const fields = fieldGroup.fields_data.flat();

            return (
              <React.Fragment key={`group-${fieldGroup.field_group_data.group_id}-${groupIndex}`}>
                {groupIndex > 0 && <List.Item.Detail.Metadata.Separator />}

                <List.Item.Detail.Metadata.Label title={fieldGroup.field_group_data.group_name.toUpperCase()} text="" />

                {fields.map((field, fieldIndex) => {
                  if (!isFieldTypeSupported(field.field_type_name)) {
                    return null;
                  }

                  const fieldColor = (field.color as Color) || Color.Blue;
                  const isTagList =
                    field.color !== undefined ||
                    (field.field_type_name === "assign-field" && Array.isArray(field.value)) ||
                    field.field_type_name === "user-field";

                  if (
                    field.field_type_name === "user-field" &&
                    field.value &&
                    typeof field.value === "object" &&
                    "text" in field.value
                  ) {
                    const userValue = field.value as UserFieldValue;
                    return (
                      <List.Item.Detail.Metadata.TagList
                        key={`${field.field_id}-${fieldIndex}`}
                        title={field.field_name}
                      >
                        <List.Item.Detail.Metadata.TagList.Item
                          key={userValue.instance_id}
                          text={userValue.text}
                          color={Color.Blue}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    );
                  }

                  if (
                    field.field_type_name === "input-datetime" &&
                    field.value &&
                    typeof field.value === "object" &&
                    "timestamp" in field.value
                  ) {
                    const dateValue = field.value as DateTimeFieldValue;
                    return (
                      <List.Item.Detail.Metadata.Label
                        key={`${field.field_id}-${fieldIndex}`}
                        title={field.field_name}
                        text={dateValue.text}
                      />
                    );
                  }

                  if (field.field_type_name === "input-email") {
                    const email = getDisplayText(field.value, field.default_value);
                    return (
                      <List.Item.Detail.Metadata.Link
                        key={`${field.field_id}-${fieldIndex}`}
                        title={field.field_name}
                        target={`mailto:${email}`}
                        text={email}
                      />
                    );
                  } else if (field.field_type_name === "input-telephone") {
                    const phoneNumber = getDisplayText(field.value, field.default_value);
                    return (
                      <List.Item.Detail.Metadata.Link
                        key={`${field.field_id}-${fieldIndex}`}
                        title={field.field_name}
                        target={`tel:${phoneNumber}`}
                        text={phoneNumber}
                      />
                    );
                  } else if (field.field_type_name === "input-link") {
                    const linkText = getDisplayText(field.value, field.default_value);
                    return (
                      <List.Item.Detail.Metadata.Link
                        key={`${field.field_id}-${fieldIndex}`}
                        title={field.field_name}
                        target={linkText}
                        text={linkText}
                      />
                    );
                  } else if (field.field_type_name === "input-address") {
                    const address = getDisplayText(field.value, field.default_value);
                    const encodedAddress = encodeURIComponent(address);
                    return (
                      <List.Item.Detail.Metadata.Link
                        key={`${field.field_id}-${fieldIndex}`}
                        title={field.field_name}
                        target={`maps://?q=${encodedAddress}`}
                        text={address}
                      />
                    );
                  } else if (field.field_type_name === "upload-files") {
                    const fileName = getDisplayText(field.value, field.default_value);
                    return (
                      <List.Item.Detail.Metadata.Link
                        key={`${field.field_id}-${fieldIndex}`}
                        title={field.field_name}
                        target={
                          typeof field.value === "object" && "location" in field.value ? field.value.location : ""
                        }
                        text={fileName}
                      />
                    );
                  } else if (isTagList && Array.isArray(field.value)) {
                    return (
                      <List.Item.Detail.Metadata.TagList
                        key={`${field.field_id}-${fieldIndex}`}
                        title={field.field_name}
                      >
                        {field.value.map((val) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={val.instance_id}
                            text={val.text}
                            color={fieldColor}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    );
                  } else if (isTagList && typeof field.default_value === "object") {
                    return (
                      <List.Item.Detail.Metadata.TagList
                        key={`${field.field_id}-${fieldIndex}`}
                        title={field.field_name}
                      >
                        <List.Item.Detail.Metadata.TagList.Item
                          key={field.default_value.instance_id}
                          text={field.default_value.text}
                          color={fieldColor}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    );
                  } else if (isTagList) {
                    const displayText = getDisplayText(field.value, field.default_value);
                    return (
                      <List.Item.Detail.Metadata.TagList
                        key={`${field.field_id}-${fieldIndex}`}
                        title={field.field_name}
                      >
                        <List.Item.Detail.Metadata.TagList.Item
                          key={`${field.field_id}-value-${fieldIndex}`}
                          text={displayText}
                          color={fieldColor}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    );
                  } else {
                    return (
                      <List.Item.Detail.Metadata.Label
                        key={`${field.field_id}-${fieldIndex}`}
                        title={field.field_name}
                        text={getDisplayText(field.value, field.default_value)}
                      />
                    );
                  }
                })}
              </React.Fragment>
            );
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
