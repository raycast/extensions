import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import statusCodesData from "./codes.json";
import { useState, useEffect } from "react";

type StatusCode = { name: string; description: string };
type StatusCodeCategory = { name: string; description: string; codes: Record<string, StatusCode> };
type StatusCodeJson = Record<string, StatusCodeCategory>;

const statusCodes: StatusCodeJson = statusCodesData;

export default function HttpStatusCodes(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const [filteredStatusCodes, setFilteredStatusCodes] = useState<StatusCodeJson>(statusCodes);
  useEffect(() => {
    const filtered: StatusCodeJson = {};
    Object.entries(statusCodes).forEach(([category, categoryData]) => {
      const filteredCodes = Object.entries(categoryData.codes).reduce(
        (acc, [code, codeData]) => {
          if (
            [code, codeData.name, codeData.description, category, categoryData.name].some((text) =>
              text.toLowerCase().includes(searchText.toLowerCase()),
            )
          ) {
            acc[code] = codeData;
          }
          return acc;
        },
        {} as Record<string, StatusCode>,
      );

      if (Object.keys(filteredCodes).length > 0) {
        filtered[category] = { ...categoryData, codes: filteredCodes };
      }
    });
    setFilteredStatusCodes(filtered);
  }, [searchText]);

  return (
    <List filtering={false} onSearchTextChange={setSearchText}>
      {Object.entries(filteredStatusCodes).map(([category, { name, codes }]) => (
        <List.Section title={`${category} - ${name}`} key={category}>
          {Object.entries(codes).map(([code, codeData]) => (
            <List.Item
              key={code}
              title={`Status ${code}`}
              subtitle={codeData.name}
              icon={{ source: Icon.Dot, tintColor: getCorrespondingIconColor(parseInt(code)) }}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={`More About Status ${code}`}
                    target={<Detail markdown={markdownGenerator(code, codeData, category, name)} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const getCorrespondingIconColor = (codeNum: number): string => {
  if (codeNum < 200) return "blue";
  if (codeNum < 300) return "green";
  if (codeNum < 400) return "yellow";
  if (codeNum < 500) return "orange";
  if (codeNum < 600) return "red";
  return "gray";
};

const getUsageExample = (codeNum: number): string => {
  if (codeNum < 200) return "The server needs to send an interim response before sending the final response.";
  if (codeNum < 300) return "The request was successful and the server is sending the requested data.";
  if (codeNum < 400)
    return "The requested resource is available at a different location or needs additional action from the client.";
  if (codeNum < 500) return "The client's request contains errors or cannot be fulfilled for some reason.";
  if (codeNum < 600) return "The server encountered an error while processing the request.";
  return "The specific conditions for this status code are met.";
};

const markdownGenerator = (code: string, codeData: StatusCode, category: string, name: string) => `
# HTTP Status ${code}: ${codeData.name}

## Description
${codeData.description}

## Category
**${category}** - ${name}

## Usage
This status code is typically used when:
- ${getUsageExample(parseInt(code))}

## Example Response
\`\`\`http
HTTP/1.1 ${code} ${codeData.name}
Content-Type: application/json

{
  "status": ${code},
  "message": "${codeData.name}",
}
\`\`\`
`;
