import { Client } from "@notionhq/client";
import { EmployeesDbFields, NotesDbFields, OKRsDbFields } from "../utils/constants";
import { NotionIcon, NotionPropertiesResponse } from "../utils/types";
import addMonths from "date-fns/addMonths";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { getPreferenceValues } from "@raycast/api";

export type DeveloperOKRsPage = {
  id?: string;
  photoUrl?: string;
  startDate?: Date;
  probationEndDate?: Date;
  competencyMapUrl?: string;
  okrsPageUrl?: string;
};

export type Employee = {
  id: string;
  name: string;
  domain?: string;
  hrbp?: string;
  country?: string;
  developerOKRs?: DeveloperOKRsPage;
  seniority?: string[];
};

export type NotionCreateResponse = {
  url?: string;
  id?: string;
};

export async function fetchDeveloperOkrs(name: string, notionToken: string): Promise<DeveloperOKRsPage> {
  const notionClient = new Client({ auth: notionToken });
  const okrsDbId = getPreferenceValues().OkrsDbId;

  const okrsResponse = await notionClient.databases.query({
    database_id: okrsDbId,
    page_size: 1,
    filter: {
      property: OKRsDbFields.name,
      rich_text: {
        contains: name || "",
      },
    },
  });
  const okrsFirstResult = okrsResponse.results[0] as PageObjectResponse | undefined;
  const okrsProperties = okrsFirstResult?.properties as NotionPropertiesResponse;
  const startDate = okrsProperties?.[OKRsDbFields.startDate]?.rollup?.array?.[0]?.date?.start;
  const probationEndDate = startDate ? addMonths(new Date(startDate), 3) : undefined;
  const icon = okrsFirstResult?.icon as NotionIcon;

  return {
    id: okrsProperties?.[OKRsDbFields.developer]?.relation?.[0]?.id,
    startDate: startDate ? new Date(startDate) : undefined,
    probationEndDate,
    photoUrl: icon?.file ? icon?.file?.url : icon?.external?.url,
    competencyMapUrl: okrsProperties?.[OKRsDbFields.competencyMap]?.url,
    okrsPageUrl: okrsFirstResult?.url,
  };
}

export async function fetchEmployees(text: string, notionToken: string): Promise<Employee[]> {
  const notionClient = new Client({ auth: notionToken });
  const employeesDbId = getPreferenceValues().EmployeesDbId;

  const notionData = await notionClient.databases.query({
    database_id: employeesDbId,
    page_size: 10,
    filter: {
      property: EmployeesDbFields.name,
      rich_text: {
        contains: text,
      },
    },
  });

  return (notionData?.results as PageObjectResponse[]).map((dbItem) => {
    const properties = dbItem.properties as NotionPropertiesResponse;

    return {
      id: dbItem.id,
      name: properties?.[EmployeesDbFields.name].title?.[0]?.plain_text || "",
      seniority: properties?.[EmployeesDbFields.seniority]?.multi_select?.map((x) => x.name) || [],
      domain: properties?.[EmployeesDbFields.domain]?.multi_select?.map((x) => x.name).join(" | "),
      hrbp: properties?.[EmployeesDbFields.hrbp]?.select?.name,
      country: properties?.[EmployeesDbFields.country]?.select?.name,
    };
  });
}

export async function newNote(
  title: string,
  notionToken: string,
  employeeNames?: string[]
): Promise<NotionCreateResponse> {
  const notionClient = new Client({ auth: notionToken });
  const okrsDbId = getPreferenceValues().OkrsDbId;
  const notesDbId = getPreferenceValues().NotesDbId;

  let developerIds: string[] = [];

  if (employeeNames && employeeNames.length > 0) {
    const promises = employeeNames
      .filter((name) => name)
      .map(async (name) => {
        const response = await notionClient.databases.query({
          database_id: okrsDbId,
          page_size: 1,
          filter: {
            property: OKRsDbFields.name,
            rich_text: {
              contains: name,
            },
          },
        });

        const okrsFirstResult = response.results[0] as PageObjectResponse | undefined;
        const properties = okrsFirstResult?.properties as NotionPropertiesResponse;

        return properties?.[OKRsDbFields.developer]?.relation?.[0]?.id;
      });

    developerIds = (await Promise.all(promises)).filter((d) => d !== undefined) as string[];
  }

  const developers = developerIds.filter((id) => id).map((d) => ({ id: d }));

  return notionClient.pages.create({
    parent: {
      type: "database_id",
      database_id: notesDbId,
    },
    properties: {
      [NotesDbFields.name]: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
      ...(developers.length > 0
        ? {
            [NotesDbFields.relatedDeveloper]: {
              relation: developers,
            },
          }
        : {}),
    },
  });
}
