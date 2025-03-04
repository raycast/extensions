import { XMLParser } from "fast-xml-parser";
import { useFetch } from "@raycast/utils";
import { API_HEADERS, BASE_URL } from "../config";
import { parseLinkHeader } from "@web3-storage/parse-link-header";

export function useActivity() {
  const { isLoading, data, pagination } = useFetch(
    (options) => options.cursor || `${BASE_URL}/ocs/v2.php/apps/activity/api/v2/activity?limit=200`,
    {
      method: "GET",
      headers: {
        ...API_HEADERS,
        "OCS-APIRequest": "true",
      },
      async parseResponse(response) {
        const linkHeader = response.headers.get("Link");
        const parsed = parseLinkHeader(linkHeader);
        const cursor = parsed?.next.url;
        const result = await response.text();
        return {
          result,
          cursor,
        };
      },
      mapResult({ result, cursor }) {
        const parser = new XMLParser();
        const dom = parser.parse(result) as Response;
        if (!("ocs" in dom)) throw new Error("Invalid response: " + result);
        if (dom.ocs.meta.status === "failure") throw new Error(dom.ocs.meta.statuscode + ": " + dom.ocs.meta.message);

        const res = dom.ocs.data;
        const activities = res.element.map((element) => {
          return {
            activityId: element.activity_id,
            app: element.app,
            type: element.type,
            user: element.user,
            subject: element.subject,
            objectType: element.object_type,
            objectName: element.object_name,
            objects: element.objects,
            link: element.link,
            icon: element.icon,
            datetime: element.datetime,
          } as Activity;
        });
        return {
          data: activities,
          hasMore: !!cursor,
          cursor,
        };
      },
      initialData: [],
    }
  );
  return { isLoading, activity: data, pagination };
}

export interface Activity {
  activityId: string;
  app: string;
  type: string;
  user: string;
  subject: string;
  objectType: string;
  objectId: string;
  objectName: string;
  objects: Objects;
  link: string;
  icon: string;
  datetime: string;
}

interface Response {
  ocs: Ocs;
}

interface Ocs {
  meta: Meta;
  data: Data;
}

interface Data {
  element: ActivityElement[];
}

interface ActivityElement {
  activity_id: string;
  app: string;
  type: string;
  user: string;
  subject: string;
  object_type: string;
  object_id: string;
  object_name: string;
  objects: Objects;
  link: string;
  icon: string;
  datetime: string;
}

interface Objects {
  element: string[] | string;
}

export interface File {
  type: string;
  id: string;
  name: string;
  path: string;
  link: string;
}

interface Meta {
  status: string;
  statuscode: number;
  message: string;
}
