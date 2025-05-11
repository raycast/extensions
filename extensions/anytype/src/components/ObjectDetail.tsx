import { Color, Detail, getPreferenceValues, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { ObjectActions, TemplateList, ViewType } from ".";
import { useObject } from "../hooks";
import {
  BodyFormat,
  Member,
  ObjectLayout,
  Property,
  PropertyFormat,
  PropertyWithValue,
  Space,
  SpaceObject,
  Type,
} from "../models";
import { bundledPropKeys, injectEmojiIntoHeading } from "../utils";

type ObjectDetailProps = {
  space: Space;
  objectId: string;
  title: string;
  mutate?: MutatePromise<SpaceObject[] | Type[] | Property[] | Member[]>[];
  layout: ObjectLayout | undefined;
  viewType: ViewType;
  isGlobalSearch: boolean;
  isPinned: boolean;
};

export function ObjectDetail({
  space,
  objectId,
  title,
  mutate,
  layout,
  viewType,
  isGlobalSearch,
  isPinned,
}: ObjectDetailProps) {
  const { push } = useNavigation();
  const { linkDisplay } = getPreferenceValues();
  const { object, objectError, isLoadingObject, mutateObject } = useObject(space.id, objectId, BodyFormat.Markdown);

  const [showDetails, setShowDetails] = useState(true);
  const properties = object?.properties || [];
  const excludedPropertyKeys = new Set([
    bundledPropKeys.addedDate,
    bundledPropKeys.lastModifiedDate,
    bundledPropKeys.lastOpenedDate,
    bundledPropKeys.lastModifiedBy,
    bundledPropKeys.links,
  ]);
  const additionalProperties = properties.filter((property) => !excludedPropertyKeys.has(property.key));

  useEffect(() => {
    if (objectError) {
      showFailureToast(objectError, { title: "Failed to fetch object" });
    }
  }, [objectError]);

  const formatOrder: { [key: string]: number } = {
    text: 0,
    number: 1,
    select: 2,
    multi_select: 3,
    checkbox: 4,
    phone: 5,
    date: 6,
    object: 7,
    file: 8,
    email: 9,
    url: 10,
  };

  const orderedProperties = additionalProperties.sort((a, b) => {
    const aGroup = a.format;
    const bGroup = b.format;
    const aGroupOrder = formatOrder[aGroup] ?? 100;
    const bGroupOrder = formatOrder[bGroup] ?? 100;

    if (aGroupOrder !== bGroupOrder) {
      return aGroupOrder - bGroupOrder;
    }

    // For properties in the 'text' group, ensure that 'description' comes first
    if (aGroup === PropertyFormat.Text && bGroup === PropertyFormat.Text) {
      if (a.key === bundledPropKeys.description && b.key !== bundledPropKeys.description) return -1;
      if (b.key === bundledPropKeys.description && a.key !== bundledPropKeys.description) return 1;
    }

    return a.name.localeCompare(b.name);
  });

  function renderDetailMetadata(property: PropertyWithValue) {
    const titleText = property.name || property.key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    if (property.format === PropertyFormat.Text) {
      return (
        <Detail.Metadata.Label
          key={property.key}
          title={titleText}
          text={{
            value: property.text
              ? property.text
              : property.key === bundledPropKeys.description
                ? "No description"
                : "No text",
            color: property.text ? Color.PrimaryText : Color.SecondaryText,
          }}
          icon={{
            source:
              property.key === bundledPropKeys.description
                ? "icons/property/description.svg"
                : "icons/property/text.svg",
            tintColor: { light: "grey", dark: "grey" },
          }}
        />
      );
    }

    if (property.format === PropertyFormat.Number) {
      return (
        <Detail.Metadata.Label
          key={property.key}
          title={titleText}
          text={{
            value: property.number ? String(property.number) : "No number",
            color: property.number ? Color.PrimaryText : Color.SecondaryText,
          }}
          icon={{ source: "icons/property/number.svg", tintColor: { light: "grey", dark: "grey" } }}
        />
      );
    }

    if (property.format === PropertyFormat.Select) {
      const tag = property.select;
      if (tag) {
        return (
          <Detail.Metadata.TagList key={property.key} title={titleText}>
            <Detail.Metadata.TagList.Item key={tag.id} text={tag.name} color={tag.color} />
          </Detail.Metadata.TagList>
        );
      } else {
        return (
          <Detail.Metadata.Label
            key={property.key}
            title={titleText}
            text={{ value: "No status", color: Color.SecondaryText }}
            icon={{ source: "icons/property/select.svg", tintColor: { light: "grey", dark: "grey" } }}
          />
        );
      }
    }

    if (property.format === PropertyFormat.MultiSelect) {
      const tags = property.multi_select;
      if (tags && tags.length > 0) {
        return (
          <Detail.Metadata.TagList key={property.key} title={titleText}>
            {tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag.id} text={tag.name} color={tag.color} />
            ))}
          </Detail.Metadata.TagList>
        );
      } else {
        return (
          <Detail.Metadata.Label
            key={property.key}
            title={titleText}
            text={{ value: "No tags", color: Color.SecondaryText }}
            icon={{ source: "icons/property/multi_select.svg", tintColor: { light: "grey", dark: "grey" } }}
          />
        );
      }
    }

    if (property.format === PropertyFormat.Date) {
      return (
        <Detail.Metadata.Label
          key={property.key}
          title={titleText}
          text={{
            value: property.date ? format(new Date(property.date), "MMMM d, yyyy") : "No date",
            color: property.date ? Color.PrimaryText : Color.SecondaryText,
          }}
          icon={{ source: "icons/property/date.svg", tintColor: { light: "grey", dark: "grey" } }}
        />
      );
    }

    if (property.format === PropertyFormat.Files) {
      const files = property.files;
      if (files && files.length > 0) {
        return (
          <Detail.Metadata.TagList key={property.key} title={titleText}>
            {files.map((file) => (
              <Detail.Metadata.TagList.Item key={file.id} text={file.name} icon={file.icon} color="grey" />
            ))}
          </Detail.Metadata.TagList>
        );
      } else {
        return (
          <Detail.Metadata.Label
            key={property.key}
            title={titleText}
            text={{ value: "No files", color: Color.SecondaryText }}
            icon={{ source: "icons/property/files.svg", tintColor: { light: "grey", dark: "grey" } }}
          />
        );
      }
    }

    if (property.format === PropertyFormat.Checkbox) {
      return (
        <Detail.Metadata.Label
          key={property.key}
          title=""
          text={titleText}
          icon={{
            source: property.checkbox ? "icons/property/checkbox1.svg" : "icons/property/checkbox0.svg",
          }}
        />
      );
    }

    if (property.format === PropertyFormat.Url) {
      if (property.url) {
        if (linkDisplay === "text") {
          return (
            <Detail.Metadata.Label
              key={property.key}
              title={titleText}
              text={property.url}
              icon={{ source: "icons/property/url.svg", tintColor: { light: "grey", dark: "grey" } }}
            />
          );
        } else {
          return (
            <Detail.Metadata.Link
              key={property.key}
              title=""
              target={property.url.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:/) ? property.url : `https://${property.url}`}
              text="Open link"
            />
          );
        }
      } else {
        return (
          <Detail.Metadata.Label
            key={property.key}
            title={titleText}
            text={{ value: "No URL", color: Color.SecondaryText }}
            icon={{ source: "icons/property/url.svg", tintColor: { light: "grey", dark: "grey" } }}
          />
        );
      }
    }

    if (property.format === PropertyFormat.Email) {
      if (property.email) {
        if (linkDisplay === "text") {
          return (
            <Detail.Metadata.Label
              key={property.key}
              title={titleText}
              text={property.email}
              icon={{ source: "icons/property/email.svg", tintColor: { light: "grey", dark: "grey" } }}
            />
          );
        } else {
          return (
            <Detail.Metadata.Link
              key={property.key}
              title=""
              target={`mailto:${property.email}`}
              text={`Mail to ${property.email}`}
            />
          );
        }
      } else {
        return (
          <Detail.Metadata.Label
            key={property.key}
            title={titleText}
            text={{ value: "No email address", color: Color.SecondaryText }}
            icon={{ source: "icons/property/email.svg", tintColor: { light: "grey", dark: "grey" } }}
          />
        );
      }
    }

    if (property.format === PropertyFormat.Phone) {
      return (
        <Detail.Metadata.Label
          key={property.key}
          title={titleText}
          text={{
            value: property.phone ? property.phone : "No phone number",
            color: property.phone ? Color.PrimaryText : Color.SecondaryText,
          }}
          icon={{ source: "icons/property/phone.svg", tintColor: { light: "grey", dark: "grey" } }}
        />
      );
    }

    if (property.format === PropertyFormat.Objects) {
      if (Array.isArray(property.objects) && property.objects.length > 0) {
        return (
          <Detail.Metadata.TagList key={property.key} title={titleText}>
            {property.objects.map((objectItem, index) => {
              const handleAction = () => {
                push(
                  <ObjectDetail
                    space={space}
                    objectId={objectItem.id}
                    title={objectItem.name}
                    layout={objectItem.layout}
                    viewType={viewType}
                    isGlobalSearch={isGlobalSearch}
                    isPinned={isPinned}
                  />,
                );
              };

              return (
                <Detail.Metadata.TagList.Item
                  key={`${property.key}-${index}`}
                  text={objectItem.name || objectItem.id}
                  icon={objectItem.icon}
                  onAction={objectItem.layout !== ObjectLayout.Participant ? handleAction : undefined}
                />
              );
            })}
          </Detail.Metadata.TagList>
        );
      } else {
        return (
          <Detail.Metadata.Label
            key={property.key}
            title={titleText}
            text={{ value: "No objects", color: Color.SecondaryText }}
            icon={{ source: "icons/property/objects.svg", tintColor: { light: "grey", dark: "grey" } }}
          />
        );
      }
    }
    return null;
  }

  const renderedDetailComponents: JSX.Element[] = [];
  let previousGroup: string | null = null;
  orderedProperties.forEach((property) => {
    const currentGroup = property.format;
    const rendered = renderDetailMetadata(property);
    if (rendered) {
      if (previousGroup !== null && currentGroup !== previousGroup) {
        renderedDetailComponents.push(<Detail.Metadata.Separator key={`separator-${property.key}`} />);
      }
      renderedDetailComponents.push(rendered);
      previousGroup = currentGroup;
    }
  });

  if (object?.type) {
    const typeTag = (
      <Detail.Metadata.TagList key="object-type" title="Type">
        <Detail.Metadata.TagList.Item
          key={object.type.id}
          text={object.type.name}
          icon={object.type.icon}
          onAction={() => {
            push(
              <TemplateList
                space={space}
                typeId={object.type.id}
                isGlobalSearch={isGlobalSearch}
                isPinned={isPinned}
              />,
            );
          }}
        />
      </Detail.Metadata.TagList>
    );

    const descIndex = renderedDetailComponents.findIndex((el) => el.key === bundledPropKeys.description);
    if (descIndex >= 0) {
      renderedDetailComponents.splice(descIndex + 1, 0, typeTag);
    } else {
      renderedDetailComponents.unshift(typeTag);
    }
  }

  const markdown = object?.markdown ?? "";
  const updatedMarkdown = injectEmojiIntoHeading(markdown, object?.icon);

  return (
    <Detail
      markdown={updatedMarkdown}
      isLoading={isLoadingObject}
      navigationTitle={!isGlobalSearch ? `Browse ${space.name}` : undefined}
      metadata={
        showDetails && renderedDetailComponents.length > 0 ? (
          <Detail.Metadata>{renderedDetailComponents}</Detail.Metadata>
        ) : undefined
      }
      actions={
        <ObjectActions
          space={space}
          objectId={objectId}
          title={title}
          mutate={mutate}
          mutateObject={mutateObject}
          layout={layout}
          object={object}
          viewType={viewType}
          isGlobalSearch={isGlobalSearch}
          isNoPinView={false}
          isPinned={isPinned}
          isDetailView={true}
          showDetails={showDetails}
          onToggleDetails={() => setShowDetails((prev) => !prev)}
        />
      }
    />
  );
}
