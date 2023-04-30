import { Alert, showToast, Toast, Form, ActionPanel, Action, confirmAlert} from "@raycast/api";
/// <reference path="./index.d.ts" />
import * as qawolf from "../qawolf/index.js";
import { useState, useEffect } from "react";
import { Client, Test } from "./interfaces.js";
import QawDropdown from "./components/QawDropdown.js";

// Idea List:
// - delete tasks from a given Maint Report (delete Maint Report?)
// - task list pulling from QAW but allowing you to add tasks to it

export default function Command() {
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [selectedTestWfNames, setSelectedTestWfNames] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!selectedClient) {
      showToast({
        style: Toast.Style.Failure,
        title: "A Test is required",
      });
      return
    }
    // set up alert
    const alert = await confirmAlert({
      title: "Are you sure?",
      message: "Test will effectivly be deleted.",
      primaryAction: {
        title: "Remove Test",
        style: Alert.ActionStyle.Destructive,
      }
    })


    if (alert) {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Removing Test from Workflows` });

      // Actions here

      toast.style = Toast.Style.Success;
      toast.title = `Test removed from Workflows`;

    } else {
      console.log("canceled");
    }
  }

  return (
    <>      
      <Form 
        enableDrafts={true}
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


        {/* secondary dropdown here */}

        <Form.Separator />

        <Form.Description
          title="Affected Workflows" text={selectedTestWfNames}
        />
      </Form>
    </>
  );
}
