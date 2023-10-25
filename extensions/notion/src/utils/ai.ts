import { AI, Toast } from "@raycast/api";

import { DatabaseProperty, fetchDatabaseProperties } from "./notion";

const template = `
Here is a given array of Notion properties:
<properties>
{properties}
</properties>

Now, using this, create a new page in the database using those properties such that they satisfy the following conditions given by the user in natural language:

<conditions>
{conditions}
</conditions>

Return a json object, with each key being the \`id\` of the Notion property, and the value being the value you have decided fits best with the aforementioned conditions specified by the user.

So, the return object must look like:
{ids}

For the \`title\` property, it must include all the information given in the original conditions. This title must be included in the response.

for a \`date\` property, it must either be in the format of a standard of an ISO 8601 string, which is \`YYYY-MM-DDTHH:mm:ss.sssZ\`, or in the format of \`YYYY-MM-DD\`. If the user's conditions specify a time, you must include that time in the response. Otherwise, only include the date. For reference, the current date is ISO 8601 date time string is \`2023-10-25T12:42:43\`.

For a \`select\` property, return the id of the option that you have decided fits best with the aforementioned conditions specified by the user. If the user's conditions do not provide a best fit, return the id \`"_select_null_"\`.

For a \`status\` property, return the id of the option that you have decided fits best with the aforementioned conditions specified by the user. If the user's conditions do not provide a best fit, return the id \`"_select_null_"\`.

For a \`multi-select\` property, return an array of all the ids of the options that you have decided fit best with the aforementioned conditions specified by the user. If the user's conditions do not provide a best fit, return an empty array \`[]\`.
  `;

export function tryParseJSON(str: string): Record<string, string> | false {
  try {
    const o = JSON.parse(str);

    if (o && typeof o === "object") {
      return o;
    }
    return false;
  } catch {
    return false;
  }
}

export function createPrompt(properties: DatabaseProperty[], conditions: string): string {
  // const date = new Date().toISOString() ;
  const date = "2023-10-28";

  // only include certain properties for AI to generate
  let databaseProperties = properties.filter((property) => ["title", "date", "select", "multi_select", "status"].includes(property.type));

  const ids =
    "{\n" +
    databaseProperties
      .map((property) => {
        return `"${property.id}": <replace this>`;
      })
      .join("\n") +
    "\n}";
  const prompt = template
    .replace("{properties}", JSON.stringify(databaseProperties))
    .replace("{conditions}", conditions)
    .replace("{date}", date)
    .replace("{ids}", ids);

  return prompt;
}

export async function getValues(databaseId: string | undefined, conditions: string) {
  databaseId = "8256750b-81a2-4c88-8df8-6a02ffb2a409";
  const toast = new Toast({ title: "fetching db props", style: Toast.Style.Animated });
  await toast.show();
  const databaseProperties = await fetchDatabaseProperties(databaseId);

  const prompt = createPrompt(databaseProperties, conditions);

  toast.title = "asking ai";

  const data = await AI.ask(prompt, {
    creativity: "none",
    // this model gets hw as "Pages 2-7 #8-29", while gpt gets just "calc hw"
    // model: "text-davinci-003",
  });

  toast.title = "parsing json";

  let json = tryParseJSON(data);

  if (!json) {
    throw new Error("Unable to parse AI response");
  }
  console.log('json', json);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: Record<string, any> = {};
  toast.title = "cleaning up props";

  for (const [id, value] of Object.entries(json)) {
    const property = databaseProperties.find((property) => property.id === id);
    if (!property) {
      throw new Error("Unable to find property");
    }
    switch (property.type) {
      case "title": {
        res["property::" + property.type + "::" + id] = value;
        break;
      }
      case "date": {
        const date = new Date("2023-10-29T16:00:00.001Z"); // TODO: use a real date
        res["property::" + property.type + "::" + id] = date;
        break;
      }
      case "select": {
        // check if value is a valid option
        const option = property.options.find((option) => option.id === value);
        console.log(value)
        if (!option && value !== "_select_null_") {
          throw new Error("Unable to find option");
        }
        res["property::" + property.type + "::" + id] = value;
        break;
      }
      case "multi_select": {
        // check if every value (bc value is an array here) is a valid option
        const options = property.options.filter((option) => value.includes(option.id));
        if (options.length !== value.length) {
          throw new Error("Unable to find option");
        }
        res["property::" + property.type + "::" + id] = value;
        break;
      }
      default: {
        res["property::" + property.type + "::" + id] = value;
        break;
      }
    }
  }

  res["database"] = databaseId;
  return {res, toast};
}

/*

{
  title: 'Calc HW Pages 2-7 #8-29',
  'is%5E~': '2023-10-27',
  '%60Vgo': '91e0f08b-a0ae-46d0-b92e-12f1e38b8714',
  'Z%7CEM': 'e6bc5074-0e76-42b4-9a6c-c1a81dc4d3b9',
  TnTz: '4dda6886-8596-4869-9d4b-53ee0aa3dc2e'
}

*/
