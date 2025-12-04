import { Form, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Fragment } from "react";

import { Team } from "../api/teams";
import { User } from "../api/users";
import { getUserAvatar } from "../helpers/avatars";
import { CustomFieldSchema, getCustomFieldsForCreateIssue, Option } from "../helpers/issues";

import { IssueFormValues } from "./CreateIssueForm";
import FormSprintDropdown from "./FormSprintDropdown";
import { FormTeamDropdown } from "./FormTeamDropdown";

type IssueFormCustomFieldsProps = {
  fields: ReturnType<typeof getCustomFieldsForCreateIssue>["customFields"];
  itemProps: ReturnType<typeof useForm<IssueFormValues>>["itemProps"];
  users?: User[];
  teams?: Team[] | null;
};

export default function IssueFormCustomFields({ fields, itemProps, users }: IssueFormCustomFieldsProps) {
  return (
    <>
      {fields.map(({ key, name, fieldSchema, allowedValues }) => {
        if (!name) return null;

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
            // We can't use FormUserDropdown (using an autocomplete URL) here because of a strange OAuth bug
            // See: https://community.developer.atlassian.com/t/oauth-2-0-is-not-enabled-for-method/60843/6
            const props = itemProps[key] as Form.ItemProps<string>;
            component = (
              <Form.Dropdown {...props} title={name} storeValue>
                <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.Person} />

                {users?.map((user) => {
                  return (
                    <Form.Dropdown.Item
                      key={user.accountId}
                      value={user.accountId}
                      title={user.displayName}
                      icon={getUserAvatar(user)}
                    />
                  );
                })}
              </Form.Dropdown>
            );
            break;
          }
          case CustomFieldSchema.team: {
            const props = itemProps[key] as Form.ItemProps<string>;
            component = <FormTeamDropdown {...props} name={name} />;
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
