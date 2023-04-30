import { showToast, Toast, Form, ActionPanel, Action, useNavigation, List, Icon, Color, Detail} from "@raycast/api";
/// <reference path="./index.d.ts" />
import * as qawolf from "../qawolf/index.js";
import { useState, useEffect } from "react";
import { Client, Test } from "./interfaces.js";
import QawDropdown from "./components/QawDropdown.js";
import { all } from "axios";

interface Values {
  searchText: string;
  includeHelpers: boolean;
}

export default function Command() {
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { push } = useNavigation();


  const handleSubmit = async (values: Values) => {
    if (!selectedClient) {
      showToast({
        style: Toast.Style.Failure,
        title: "A Test is required",
      });
      return
    }
    setIsLoading(true);
    
    const toast = await showToast({ style: Toast.Style.Animated, title: `Searching Tests` });
    qawolf.getTestsWithCode(selectedClient.id, values.searchText)
      .then((res: Test[]) => {
        // action after data retrieved
        const allLines: any = [];

        for (const test of res) {
          if (!values.includeHelpers && test.name === "Helpers") {
            continue
          }
          // split code into lines
          const lines = test.code.split("\n");
          // loop through lines and check if line includes search text
          for (let li = 0; li < lines.length; li++) {
            // if line includes search text, add details to allLines
            
            // trim lines so searched text is always in view and centered in long lines
            if (lines[li].includes(values.searchText)) {
              const lineLength = values.searchText.length;
              const lineParts = lines[li].split(values.searchText);
              const maxLineLength = 35;
              const maxLength = Math.floor((maxLineLength - lineLength) / 2);
  
              function subtractAndZeroNegative(num1: number, num2: number) {
                const result = num1 - num2;
                return result < 0 ? 0 : result;
              }
  
              const firstRemainder = subtractAndZeroNegative(maxLength, lineParts[0].length);
              const secondRemainder = subtractAndZeroNegative(maxLength, lineParts[1].length);
  
              const trimmedLine = lineParts.map((linePart, index) => {
                if (index === 0) return firstRemainder ? linePart.slice((maxLength + secondRemainder) * -1) : "..." + linePart.slice((maxLength + secondRemainder) * -1);
                  return secondRemainder ? linePart.slice(0, (maxLength + firstRemainder)) : linePart.slice(0, (maxLength + firstRemainder)) + "..."
                }).join(values.searchText);

              allLines.push({
                testName: test.name.length > 35 ? test.name.slice(0, 35) + "..." : test.name,
                testId: test.id,
                n: li + 1,
                fullCode: test.code,
                codeLine: trimmedLine,
                workflows: test.tests,
              });
            }
          }
        }
        toast.style = Toast.Style.Success;
        toast.title = `Search complete`;
        return allLines;
      })
      .then((allLines: any) => {
        // if no matching lines, show empty view
        if (!allLines?.length) {
          push(
            <List>
              <List.EmptyView icon="🤷" title="Nothing here" description="No tests found that contain your string"/>
            </List>
          )
        }
        else {
          // if matching lines, show list
            push(
              <List navigationTitle="Matching Tests" searchBarPlaceholder="Search Test Names">
                {allLines?.map((line: any, index: number) => (
                  <List.Item
                    actions={
                      <ActionPanel title="Test Actions">
                          <Action.Push
                            title="View Full Code"
                            target={
                              <Detail
                                markdown={
                                  `### ${line.testName}\n\`\`\`js\n${
                                    line.fullCode
                                  }\n\`\`\``
                                }
                                navigationTitle="Test Details"
                                actions={
                                  <ActionPanel title="Test Actions">
                                    <Action.OpenInBrowser title="Open Test in Browser" url={`https://app.qawolf.com/tests/${line.workflows[0].test.id}`} />
                                  </ActionPanel>
                                }
                                
                                />
                            }
                          />
                          <Action.OpenInBrowser title="Open Test in Browser" url={`https://app.qawolf.com/tests/${line.workflows[0].test.id}`} />
                        </ActionPanel>
                      }
                      icon={Icon.CheckCircle}
                      title={line.testName}
                      subtitle={line.codeLine}
                      key={`${line.testId}${index}`}
                      accessories={[
                        // { text: `${line.n}`}, 
                        { tag: { value: `Line: ${line.n}`, color: Color.Green}},
                        { tag: { value: `WFs: ${line.workflows.length}`, color: Color.Magenta}}
                      ]}
                    />
                  ))}
              </List>
            );
        }
      })
      .catch((err: any) => console.warn(err.message))
    setIsLoading(false);
  }

  return (
    <>      
      <Form
        isLoading={isLoading}
        enableDrafts={false}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Submit Action" onSubmit={handleSubmit} />
          </ActionPanel>
        }>
          
        {/* Client List */}
        <QawDropdown 
          fieldTitle="Client List"
          setSelectedItem={setSelectedClient}
          setIsLoading={setIsLoading}
          qawQuery={qawolf.getAllClients}
        />

        {/* <Form.Description text="Searches are Case Sensitive" /> */}
        {/* secondary dropdown here */}
        <Form.TextField id="searchText" title="Search Text" storeValue={true} info="Searches are Case Sensitive" />

        <Form.Checkbox id="includeHelpers" label="Include Helpers" defaultValue={false} />

      </Form>
    </>
  );
}
