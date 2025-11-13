import { Action, ActionPanel, List, Icon, Detail, Color } from "@raycast/api";
import { useFetch, useFrecencySorting } from "@raycast/utils";
import { z } from "zod";

import {
  FunctionalityScope,
  UserTypes,
  Service,
  ServiceWithId,
  GetAvailableServiceDetailsResponse,
} from "./types/core";
import { useGetAvailableServices, useGetAvailableServiceDetails } from "./lib/eva-services/services";

export default function Command() {
  const { data, isLoading } = useGetAvailableServices({});
  const { data: sortedData, visitItem } = useFrecencySorting(
    data?.Services?.map((service) => ({ ...service, id: service.Name ?? "" })).filter((s) => s.id) ?? []
  );
  return (
    <List isLoading={isLoading} navigationTitle="Find EVA services">
      {sortedData.map((service, index) => (
        <List.Item
          key={`${service.Namespace}-${index}`}
          title={service.Name!}
          accessories={[{ icon: { source: Icon.Info, tintColor: Color.Blue } }]}
          actions={
            <Actions
              service={service as ServiceWithId}
              serviceDetails={undefined}
              view="overview"
              visitItem={visitItem}
            />
          }
        />
      ))}
    </List>
  );
}

export type View = "overview" | "detail" | "serviceCall" | "serviceResponse" | "typings" | "apiDocsReference";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEnumKeysByValue(enumObject: any, value?: number | null): string[] {
  const keys: string[] = [];
  for (const key in enumObject) {
    const valueIsNumber = typeof value === "number";
    if ((valueIsNumber && enumObject[key] & value) === enumObject[key] && enumObject[key] !== 0) {
      keys.push(key);
    }
  }
  return keys;
}

const DetailsMetaData = ({
  service,
  serviceDetails,
}: {
  service: ServiceWithId;
  serviceDetails?: GetAvailableServiceDetailsResponse;
}) => {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Offline available"
        text={service.AvailableOffline ? { value: "Yes", color: Color.Green } : { value: "No", color: Color.Red }}
      />
      <Detail.Metadata.Label
        title="Allow public"
        text={service.AllowPublic ? { value: "Yes", color: Color.Green } : { value: "No", color: Color.Red }}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Requires authentication"
        text={
          serviceDetails?.Security?.RequiresAuthentication
            ? { value: "Yes", color: Color.Green }
            : { value: "No", color: Color.Red }
        }
      />
      {getEnumKeysByValue(UserTypes, serviceDetails?.Security?.RequiredUserType)?.length ? (
        <Detail.Metadata.TagList title="Required user type">
          {getEnumKeysByValue(UserTypes, serviceDetails?.Security?.RequiredUserType)?.map((value, index) => (
            <Detail.Metadata.TagList.Item key={index} text={value} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
      {service.Functionality ? (
        <>
          <Detail.Metadata.Label title="Functionality" text={service.Functionality ? service.Functionality : "-"} />
          <Detail.Metadata.TagList title="Scope">
            {getEnumKeysByValue(FunctionalityScope, service.Scope)?.map((value, index) => (
              <Detail.Metadata.TagList.Item key={index} text={value} />
            ))}
          </Detail.Metadata.TagList>
        </>
      ) : null}
      {serviceDetails?.Deprecation ? (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Deprecation" text={serviceDetails?.Deprecation} />
        </>
      ) : null}
    </Detail.Metadata>
  );
};

const Details = ({ service }: { service: ServiceWithId }) => {
  const { data, isLoading } = useGetAvailableServiceDetails({
    Type: service.Type ?? "",
  });

  const markDown = `
  # ${service.Name}
  \`${service.Type}\`

  ${data?.Description || "No description available"}

  `;

  return (
    <Detail
      navigationTitle={service.Name}
      isLoading={isLoading}
      markdown={markDown}
      actions={<Actions service={service} serviceDetails={data} view="detail" />}
      metadata={<DetailsMetaData service={service} serviceDetails={data} />}
    />
  );
};

const Actions = ({
  service,
  view,
  visitItem,
  apiDocsRefData,
}: {
  service: ServiceWithId;
  serviceDetails?: GetAvailableServiceDetailsResponse;
  view: View;
  visitItem?: (service: ServiceWithId) => Promise<void>;
  apiDocsRefData?: ApiRefDoc;
}) => {
  return (
    <ActionPanel>
      {view === "overview" && (
        <>
          <Action.Push
            title="View Details"
            onPush={() => visitItem?.(service)}
            target={<Details service={service} />}
            icon={Icon.Info}
          />
          <Action.OpenInBrowser
            url={`https://dora.on-eva.io/${service.Name}`}
            onOpen={() => visitItem?.(service)}
            title="Open in Dora"
            icon={Icon.Link}
          />
          <Action.Push
            title="API Reference Docs"
            target={<APIReferenceDocsOverview service={service} />}
            icon={Icon.Bookmark}
            shortcut={{ key: "j", modifiers: ["cmd", "shift"] }}
          />
        </>
      )}

      {view === "detail" && (
        <>
          <Action.Push
            title="API Reference Docs"
            target={<APIReferenceDocsOverview service={service} />}
            icon={Icon.Bookmark}
          />
          <Action.OpenInBrowser url={`https://dora.on-eva.io/${service.Name}`} title="Open in Dora" icon={Icon.Link} />
        </>
      )}
      {view === "apiDocsReference" && (
        <>
          <Action.Push
            title={"Request Types"}
            target={
              <APIDocsReferenceTypesList
                service={service}
                data={apiDocsRefData}
                propertyId={apiDocsRefData?.request_type_id ?? ""}
                typeName="Request"
              />
            }
          />
          <Action.Push
            title={"Response Types"}
            target={
              <APIDocsReferenceTypesList
                service={service}
                data={apiDocsRefData}
                propertyId={apiDocsRefData?.response_type_id ?? ""}
                typeName="Response"
              />
            }
          />
          <Action.Push
            title="Request Samples"
            target={<APIDocsReferenceRequestExample service={service} data={apiDocsRefData} />}
            shortcut={{ key: "j", modifiers: ["cmd", "shift"] }}
          />
          <Action.Push
            title="Response Samples"
            target={<APIDocsReferenceResponseExample service={service} data={apiDocsRefData} />}
            shortcut={{ key: "d", modifiers: ["cmd", "shift"] }}
          />
          <Action.Push
            title="Headers"
            target={<APIDocsReferenceHeaders service={service} data={apiDocsRefData} />}
            shortcut={{ key: "h", modifiers: ["cmd", "shift"] }}
          />
        </>
      )}
    </ActionPanel>
  );
};

const apiRefDocSchema = z.object({
  description: z.string().optional(),
  auth_description: z.string().optional(),
  method: z.string().optional(),
  path: z.string().optional(),
  deprecationNotice: z.string().optional().nullable(),
  headers: z.array(
    z.object({
      name: z.string(),
      type: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      required: z.boolean().optional().nullable(),
      default: z.any().optional().nullable(),
    })
  ),
  request_samples: z
    .array(
      z.object({
        name: z.enum(["JSON", "CURL"]),
        sample: z.string(),
        syntax: z.enum(["json", "bash"]),
      })
    )
    .optional(),
  response_samples: z.array(
    z.object({
      name: z.string().optional(),
      sample: z.string().optional(),
    })
  ),
  request_type_id: z.string().optional().nullable(),
  response_type_id: z.string().optional().nullable(),
  types: z.record(
    z.string(),
    z.array(
      z.object({
        name: z.string(),
        deprecation_notice: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        type: z.string().optional().nullable(),
        required: z.boolean().optional().nullable(),
        properties_id: z.string().optional().nullable(),
        one_of: z
          .array(z.object({ name: z.string(), properties_id: z.string(), type: z.string().optional().nullable() }))
          .optional()
          .nullable(),
      })
    )
  ),
});

type ApiRefDoc = z.infer<typeof apiRefDocSchema>;

const APIReferenceDocsOverview = ({ service }: { service: Service & { id: string } }) => {
  const { data, isLoading } = useFetch(
    `https://raw.githubusercontent.com/new-black/eva-apispec/main/output/apidocs/eva/services/${service.Name}.json`,
    {
      mode: "no-cors",
      keepPreviousData: true,
      parseResponse: async (response) => {
        const json = await response.json();
        return apiRefDocSchema.parse(json);
      },
    }
  );

  const markDown = `
  # API Reference Docs
  ## ${service.Name}
  ---
  ${data?.description}

  ${data?.auth_description}

  `;

  return (
    <Detail
      navigationTitle={`API Reference Docs - ${service.Name}`}
      isLoading={isLoading}
      markdown={markDown}
      actions={<Actions service={service} view="apiDocsReference" apiDocsRefData={data} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Method">
            <Detail.Metadata.TagList.Item text={data?.method} color={Color.Blue} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Path" text={data?.path} />
          <Detail.Metadata.Label title="Deprecation Notice" text={data?.deprecationNotice ?? "None"} />
        </Detail.Metadata>
      }
    />
  );
};

const APIDocsReferenceHeaders = ({ data }: { service: Service; data?: ApiRefDoc }) => {
  const headers = data?.headers;

  const getMarkDown = (title = "", description = "") => {
    return `# ${title}
  
  ${description ?? ""}
  `;
  };

  return (
    <List isShowingDetail>
      {headers?.map((header) => (
        <List.Item
          key={header.name}
          title={header.name}
          subtitle={header.type ?? ""}
          accessories={[
            {
              tag: header.required ? "Required" : "Optional",
              text: {
                value: header.required ? "Required" : "Optional",
                color: header.required ? Color.Red : Color.SecondaryText,
              },
            },
          ]}
          detail={
            <List.Item.Detail
              markdown={getMarkDown(header?.name, header?.description ?? "")}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Type" text={header.type ?? "-"} />
                  <List.Item.Detail.Metadata.Label
                    title="Required?"
                    text={
                      header.required ? { value: "Yes", color: Color.Red } : { value: "No", color: Color.SecondaryText }
                    }
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Default"
                    text={
                      header.default
                        ? { value: header.default, color: Color.Green }
                        : { value: "-", color: Color.SecondaryText }
                    }
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
};

const APIDocsReferenceRequestExample = ({ service, data }: { service: Service; data?: ApiRefDoc }) => {
  const markDown = `
  # ${service.Name}
  
  ## Request Example
  
  ${data?.request_samples
    ?.map(
      (sample) => `
  ### ${sample.name}
  
  \`\`\`${sample.syntax}
  ${sample.sample}
  \`\`\`
  
  `
    )
    .join("")}
  `;

  return <Detail markdown={markDown} />;
};

const APIDocsReferenceResponseExample = ({ service, data }: { service: Service; data?: ApiRefDoc }) => {
  const markDown = `
  # ${service.Name}
  
  ## Response Example
  
  ${data?.response_samples
    ?.map(
      (sample) => `
  ### ${sample.name}
  
  \`\`\`json
  ${sample.sample}
  \`\`\`
  
  `
    )
    .join("")}
  `;

  return <Detail markdown={markDown} />;
};

type APIDocsReferenceType = ApiRefDoc["types"][string][number];

// Generate bullet list of fields with EVA types preserved
const generateFieldsList = (
  propertyId: string,
  data?: ApiRefDoc,
  depth = 0,
  visited: Set<string> = new Set(),
  serviceName?: string,
  typeName?: string
): string => {
  if (!data?.types[propertyId]) return "";

  // Prevent infinite recursion on circular references
  if (visited.has(propertyId)) return "";
  visited.add(propertyId);

  // Limit depth to prevent stack overflow
  if (depth > 10) return "";

  const indent = "  ".repeat(depth);
  const properties = data.types[propertyId];
  let output = "";

  // Add service name and type name header at root level
  if (depth === 0 && serviceName && typeName) {
    output += `${serviceName} - ${typeName}\n\n`;
  }

  properties.forEach((prop) => {
    const required = prop.required ? "(required)" : "(optional)";
    const type = prop.type || "object";

    // Handle oneOf (union types)
    if (prop.one_of) {
      const unionTypes = prop.one_of.map((o) => o.type || o.name).join(" | ");
      output += `${indent}- ${prop.name}: ${unionTypes} ${required}\n`;
      // Add nested properties for each union option
      prop.one_of.forEach((option) => {
        if (option.properties_id && data.types[option.properties_id] && !visited.has(option.properties_id)) {
          output += `${indent}  - ${option.name}:\n`;
          output += generateFieldsList(option.properties_id, data, depth + 2, visited, serviceName, typeName);
        }
      });
    }
    // Handle nested object types
    else if (prop.properties_id && data.types[prop.properties_id] && !visited.has(prop.properties_id)) {
      output += `${indent}- ${prop.name}: ${type} ${required}\n`;
      output += generateFieldsList(prop.properties_id, data, depth + 1, visited, serviceName, typeName);
    }
    // Handle simple types (including arrays)
    else {
      output += `${indent}- ${prop.name}: ${type} ${required}\n`;
    }
  });

  return output;
};

const APIDocsReferenceTypesList = ({
  service,
  data,
  propertyId,
  oneOf,
  typeName,
}: {
  service: Service;
  data?: ApiRefDoc;
  propertyId: string;
  oneOf?: boolean;
  typeName?: string;
}) => {
  const base = data?.types[propertyId];

  const isOneOf = (type: APIDocsReferenceType) => {
    return type?.one_of ? true : false;
  };

  return (
    <List>
      {typeName && data && propertyId && !oneOf && (
        <List.Item
          key="_copy_action"
          title={`Copy All ${typeName} Fields`}
          icon={Icon.Clipboard}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title={`Copy ${typeName} Fields`}
                content={generateFieldsList(propertyId, data, 0, new Set(), service.Name, typeName)}
              />
            </ActionPanel>
          }
        />
      )}
      {!oneOf &&
        base?.map((type) => (
          <List.Item
            key={type.name}
            title={type.name}
            subtitle={type?.type ?? ""}
            accessories={[
              {
                tag: type?.required ? "Required" : "Optional",
                text: {
                  value: type?.required ? "Required" : "Optional",
                  color: type?.required ? Color.Red : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={type?.one_of || type?.properties_id ? "View Properties" : "View Details"}
                  target={
                    type?.one_of ? (
                      <APIDocsReferenceOneOfList property={type} service={service} data={data} />
                    ) : type.properties_id ? (
                      <APIDocsReferenceTypesList
                        service={service}
                        data={data}
                        propertyId={type.properties_id}
                        oneOf={isOneOf(type)}
                      />
                    ) : (
                      <APIDocsReferenceTypesDetails service={service} property={type} />
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
};

const APIDocsReferenceTypesDetails = ({
  property,
}: {
  service: Service;
  property: ApiRefDoc["types"][string][number];
}) => {
  const markDown = `
  # ${property.name}

  ${property?.description}

  ${property?.deprecation_notice ? `**Deprecation Notice**: ${property.deprecation_notice}` : ""}
  `;

  return (
    <Detail
      markdown={markDown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={property.type ?? "-"} />
          <Detail.Metadata.Label
            title="Required?"
            text={property.required ? { value: "Yes", color: Color.Red } : { value: "No", color: Color.SecondaryText }}
          />
        </Detail.Metadata>
      }
    />
  );
};

const APIDocsReferenceOneOfList = ({
  property,
  service,
  data,
}: {
  service: Service;
  property: ApiRefDoc["types"][string][number];
  data?: ApiRefDoc;
}) => {
  const items = property.one_of;

  return (
    <List>
      {items?.map((item) => (
        <List.Item
          key={item.name}
          title={item.name}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Properties"
                target={<APIDocsReferenceTypesList propertyId={item.properties_id} service={service} data={data} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
