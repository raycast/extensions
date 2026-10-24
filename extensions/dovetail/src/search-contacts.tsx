import { List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { format } from "date-fns";
import { endpoints, Field } from "./api/endpoints";
import { useSearch } from "./hooks/useSearch";

const OPTION_COLORS = ["#4F8FFF", "#FFD700", "#FF69B4", "#00C49A", "#FF7043", "#A259FF", "#FFB300", "#00B8D9"];

// getAvatarIcon's default palette is hex colors, and hex colors contain a literal "#" — inside
// an un-encoded `data:image/svg+xml,` URI that character starts a fragment, which can truncate
// the SVG before its closing tag and render as a broken image. rgb() colors avoid "#" entirely.
const AVATAR_COLORS = [
  "rgb(79, 143, 255)",
  "rgb(255, 105, 180)",
  "rgb(0, 196, 154)",
  "rgb(255, 112, 67)",
  "rgb(162, 89, 255)",
  "rgb(255, 179, 0)",
  "rgb(0, 184, 217)",
  "rgb(220, 130, 154)",
];

function avatarColorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export default function SearchContacts() {
  const { data, isLoading, numberOfResults, onQueryChange, pagination } = useSearch(endpoints.contacts);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={onQueryChange}
      throttle
      searchBarPlaceholder="Search contacts by name..."
      pagination={pagination}
    >
      <List.Section title="Contacts" subtitle={numberOfResults}>
        {data.map((item) => {
          const [emails, ...fields] = extractEmailsFromFields(item.fields);
          return (
            <List.Item
              key={item.id}
              id={item.id}
              title={item.name || "Untitled contact"}
              icon={getAvatarIcon(item.name || "?", {
                background: avatarColorFor(item.name || item.id),
                gradient: false,
              })}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={item.name || "Untitled contact"} />
                      <List.Item.Detail.Metadata.Label title="Email" text={emails?.join(", ")} />
                      {item.created_at && (
                        <List.Item.Detail.Metadata.Label
                          title="Created"
                          text={format(new Date(item.created_at), "d MMMM yyyy")}
                        />
                      )}
                      {fields !== undefined && fields.length > 0 && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          {fields.map((field, idx) => {
                            if (Array.isArray(field.value)) {
                              return (
                                <List.Item.Detail.Metadata.TagList key={idx} title={field.label}>
                                  {field.value.map((option: string, optionIdx: number) => (
                                    <List.Item.Detail.Metadata.TagList.Item
                                      key={optionIdx}
                                      text={option}
                                      color={OPTION_COLORS[idx % OPTION_COLORS.length]}
                                    />
                                  ))}
                                </List.Item.Detail.Metadata.TagList>
                              );
                            }
                            return (
                              <List.Item.Detail.Metadata.Label
                                key={idx}
                                title={field.label}
                                text={field.value == null ? "" : String(field.value)}
                              />
                            );
                          })}
                        </>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function extractEmailsFromFields(fields: Field[]): [string[] | null, ...ReadonlyArray<Required<Field>>] {
  if (fields === undefined) {
    return [null];
  }

  const rest = [];
  let emails: string[] | null = null;

  for (const field of fields) {
    if (field.label?.toLowerCase() === "email") {
      emails = Array.isArray(field.value) ? field.value : typeof field.value === "string" ? [field.value] : [];
    } else if (field.label !== undefined) {
      rest.push(field as Required<Field>);
    }
  }

  return [emails, ...rest];
}
