import { Detail } from "@raycast/api";
import { Fragment, useState } from "react";

import { User } from "../api/users";
import { getUserAvatar } from "../helpers/avatars";
import {
  CustomFieldSchema,
  getCustomFieldsForDetail,
  Sprint,
  Option,
  formatDate,
  formatDateTime,
} from "../helpers/issues";

type IssueDetailCustomFieldsProps = {
  fields: ReturnType<typeof getCustomFieldsForDetail>["customMetadataFields"];
};

function sprintDisplayName(s: Sprint) {
  return s.name?.trim() ? s.name : `Sprint ${s.id}`;
}

function SprintFieldMetadata({ title, sprints }: { title: string; sprints: Sprint[] }) {
  const [expanded, setExpanded] = useState(false);

  if (sprints.length === 0) {
    return <Detail.Metadata.Label title={title} text="None" />;
  }

  if (sprints.length === 1) {
    return (
      <Detail.Metadata.TagList title={title}>
        <Detail.Metadata.TagList.Item text={sprintDisplayName(sprints[0])} />
      </Detail.Metadata.TagList>
    );
  }

  if (!expanded) {
    const more = sprints.length - 1;
    return (
      <Detail.Metadata.TagList title={title}>
        <Detail.Metadata.TagList.Item text={sprintDisplayName(sprints[0])} />
        <Detail.Metadata.TagList.Item text={`+${more}`} onAction={() => setExpanded(true)} />
      </Detail.Metadata.TagList>
    );
  }

  return (
    <Detail.Metadata.TagList title={title}>
      {sprints.map((s, index) => (
        <Detail.Metadata.TagList.Item key={String(s.id ?? s.name ?? index)} text={sprintDisplayName(s)} />
      ))}
      <Detail.Metadata.TagList.Item text="−" onAction={() => setExpanded(false)} />
    </Detail.Metadata.TagList>
  );
}

export default function IssueDetailCustomFields({ fields }: IssueDetailCustomFieldsProps) {
  return (
    <>
      {fields.map(({ key, name, value, fieldSchema }) => {
        if (!name) return null;

        let component;
        switch (fieldSchema) {
          case CustomFieldSchema.datePicker: {
            const typedValue = value as string;
            component = <Detail.Metadata.Label title={name} text={formatDate(typedValue)} />;
            break;
          }
          case CustomFieldSchema.dateTime: {
            const typedValue = value as string;
            component = <Detail.Metadata.Label title={name} text={formatDateTime(typedValue)} />;
            break;
          }
          case CustomFieldSchema.epicLabel:
          case CustomFieldSchema.epicLink:
          case CustomFieldSchema.textfield: {
            const typedValue = value as string;
            component = <Detail.Metadata.Label title={name} text={typedValue} />;
            break;
          }
          case CustomFieldSchema.storyPointEstimate:
          case CustomFieldSchema.float: {
            const typedValue = value as number;
            component = <Detail.Metadata.Label title={name} text={String(typedValue)} />;
            break;
          }
          case CustomFieldSchema.team: {
            const typedValue = value as { name: string };
            component = <Detail.Metadata.Label title={name} text={typedValue.name} />;
            break;
          }
          case CustomFieldSchema.labels: {
            const typedValue = value as string[];
            component = (
              <Detail.Metadata.TagList title={name}>
                {typedValue.map((label) => (
                  <Detail.Metadata.TagList.Item key={label} text={label} />
                ))}
              </Detail.Metadata.TagList>
            );
            break;
          }
          case CustomFieldSchema.multiSelect:
          case CustomFieldSchema.multiCheckboxes: {
            const typedValue = value as Option[];
            component = (
              <Detail.Metadata.TagList title={name}>
                {typedValue.map((option) => (
                  <Detail.Metadata.TagList.Item key={option.id} text={option.value} />
                ))}
              </Detail.Metadata.TagList>
            );
            break;
          }
          case CustomFieldSchema.radioButtons:
          case CustomFieldSchema.select: {
            const typedValue = value as Option;
            component = (
              <Detail.Metadata.TagList title={name}>
                <Detail.Metadata.TagList.Item text={typedValue.value} />
              </Detail.Metadata.TagList>
            );
            break;
          }
          case CustomFieldSchema.sprint: {
            const raw = value as Sprint | Sprint[] | null | undefined;
            const sprints = Array.isArray(raw) ? raw : raw ? [raw] : [];
            component = <SprintFieldMetadata title={name} sprints={sprints} />;
            break;
          }
          case CustomFieldSchema.userPicker: {
            const typedValue = value as User;
            component = (
              <Detail.Metadata.Label title={name} text={typedValue.displayName} icon={getUserAvatar(typedValue)} />
            );
            break;
          }
        }

        return <Fragment key={key}>{component}</Fragment>;
      })}
    </>
  );
}
