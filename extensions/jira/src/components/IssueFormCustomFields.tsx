import { Form, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Fragment } from "react";

import { User } from "../api/users";
import { CustomFieldSchema, getCustomFieldsForCreateIssue, Option } from "../helpers/issues";

import { IssueFormValues } from "./CreateIssueForm";
import FormSprintDropdown from "./FormSprintDropdown";

type IssueFormCustomFieldsProps = {
  fields: ReturnType<typeof getCustomFieldsForCreateIssue>["customFields"];
  itemProps: ReturnType<typeof useForm<IssueFormValues>>["itemProps"];
  users?: User[];
};

export default function IssueFormCustomFields({ fields, itemProps, users }: IssueFormCustomFieldsProps) {
  return (
    <>
      {fields.map(({ key, name, fieldSchema, allowedValues }) => {
        let component;
        switch (fieldSchema) {
          case CustomFieldSchema.datePicker: {
            const props = itemProps[key] as Form.ItemProps<Date | null>;
            component = <Form.DatePicker {...props} title={name} type={Form.DatePicker.Type.Date} />;
            break;
          }
          case CustomFieldSchema.dateTime: {
            const props = itemProps[key] as Form.ItemProps<Date | null>;
            component = <Form.DatePicker {...props} title={name} type={Form.DatePicker.Type.DateTime} />;
            break;
          }
          case CustomFieldSchema.epicLabel:
          case CustomFieldSchema.textfield:
          case CustomFieldSchema.storyPointEstimate:
          case CustomFieldSchema.float: {
            const props = itemProps[key] as Form.ItemProps<string>;
            component = <Form.TextField {...props} title={name} />;
            break;
          }
          case CustomFieldSchema.textarea: {
            const props = itemProps[key] as Form.ItemProps<string>;
            component = (
              <Form.TextArea
                {...props}
                title={name}
                placeholder="Fields supports Markdown, e.g **bold**"
                enableMarkdown
              />
            );
            break;
          }
          case CustomFieldSchema.multiSelect:
          case CustomFieldSchema.multiCheckboxes: {
            const props = itemProps[key] as Form.ItemProps<string[]>;
            const options = allowedValues as Option[];
            component = (
              <Form.TagPicker {...props} title={name} placeholder="Start">
                {options.map((option) => {
                  return <Form.TagPicker.Item key={option.id} title={option.value} value={option.id} />;
                })}
              </Form.TagPicker>
            );
            break;
          }
          case CustomFieldSchema.radioButtons:
          case CustomFieldSchema.select: {
            const props = itemProps[key] as Form.ItemProps<string>;
            const options = allowedValues as Option[];
            component = (
              <Form.Dropdown {...props} title={name}>
                <Form.Dropdown.Item title="None" value="" />

                {options.map((option) => {
                  return <Form.Dropdown.Item key={option.id} title={option.value} value={option.id} />;
                })}
              </Form.Dropdown>
            );
            break;
          }
          case CustomFieldSchema.sprint: {
            const props = itemProps[key] as Form.ItemProps<string>;
            component = <FormSprintDropdown {...props} title={name} name={name} />;
            break;
          }
          case CustomFieldSchema.userPicker: {
            const props = itemProps[key] as Form.ItemProps<string>;
            component = (
              <Form.Dropdown {...props} title="Assignee" storeValue>
                <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.Person} />

                {users?.map((user) => {
                  return (
                    <Form.Dropdown.Item
                      key={user.accountId}
                      value={user.accountId}
                      title={user.displayName}
                      icon={user.avatarUrls["32x32"]}
                    />
                  );
                })}
              </Form.Dropdown>
            );
            break;
          }
        }

        if (component) {
          return <Fragment key={key}>{component}</Fragment>;
        }
      })}
    </>
  );
}
