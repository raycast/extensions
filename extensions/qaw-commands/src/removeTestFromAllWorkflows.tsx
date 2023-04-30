import { Alert, showToast, Toast, Form, ActionPanel, Action, confirmAlert} from "@raycast/api";
/// <reference path="./index.d.ts" />
import * as qawolf from "../qawolf/index.js";
import { useState, useEffect } from "react";
import { Client, Test } from "./interfaces.js";
import QawDropdown from "./components/QawDropdown.js";

export default function Command() {
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [selectedTest, setSelectedTest] = useState<Test | undefined>();
  const [selectedTestData, setSelectedTestData] = useState<Test | undefined>();
  const [selectedTestWfNames, setSelectedTestWfNames] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  useEffect(() => {
    if (!selectedTest) return;
    qawolf.getTestById(selectedClient?.id, selectedTest?.id)
      .then((res: any) => {
        setSelectedTestData(res);

        let testWfNames = ""
        res?.tests.map((association: any, index: number) => testWfNames += `(${(association.test.status)}) ${association.test.name}\n`)
        setSelectedTestWfNames(testWfNames);
      })
      .catch ((err: any) => console.warn(err.message));

      // slight timeout so loading indicator stops when last results appear
      // setTimeout(() => setIsLoading(false), 200);

  }, [selectedTest]);


  const handleSubmit = async () => {
    if (!selectedTestData) {
      showToast({
        style: Toast.Style.Failure,
        title: "A Test is required",
      });
      return
    }

    // ask for confirmation
    const alert = await confirmAlert({
      title: "Are you sure?",
      message: "Test will effectivly be deleted.",
      primaryAction: {
        title: "Remove Test",
        style: Alert.ActionStyle.Destructive,
      }
    })

    // if confirmed, remove test from all workflows
    if (alert) {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Removing Test from ${selectedTestData?.tests.length} Workflows` });

      selectedTestData?.tests.map(async (stepTest: any, index: number) => {
        // remove test from all workflos
      await qawolf.removeStepFromTest(stepTest.id);
      })
    

      toast.style = Toast.Style.Success;
      toast.title = `Test removed from ${selectedTestData?.tests.length} Workflows`;

    } else {
      console.log("canceled");
    }
  }

  return (
    <>      
      <Form 
        enableDrafts={true}
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Remove from WFs" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        {/* Client List */}
        <QawDropdown 
          fieldTitle="Client List"
          setSelectedItem={setSelectedClient}
          setIsLoading={setIsLoading}
          qawQuery={qawolf.getAllClients}
        />

        {/* Test List */}
        <QawDropdown
          fieldTitle="Test List"
          setSelectedItem={setSelectedTest}
          updateOn={selectedClient}
          setIsLoading={setIsLoading}
          qawQuery={qawolf.getTestsForClient}
          queryVars={selectedClient?.id}
        />

        <Form.Separator />

        {/* Displays Affected Workflows */}
        <Form.Description
          title="Affected Workflows" text={selectedTestWfNames}
        />
      </Form>
    </>
  );
}
