import { showToast, Toast, Form, ActionPanel, Action, Clipboard, Icon } from "@raycast/api";
/// <reference path="./index.d.ts" />
import * as qawolf from "../qawolf/index.js";
import { useState, useEffect } from "react";
import { gql } from "graphql-request";
import { Client, Environment } from "./interfaces.js";
import QawDropdown from "./components/QawDropdown.js";


export default function Command() {
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [selectedEnv, setSelectedEnv] = useState<Environment | undefined>();
  const [newEnvName, setNewEnvName] = useState<string | undefined>("");
  const [isLoading, setIsLoading] = useState<boolean | undefined>(false);

  const handleSubmit = async () => {
    if (!selectedClient || !selectedEnv || !newEnvName) {
      showToast({
        style: Toast.Style.Failure,
        title: "All fieds required",
      });
      return
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating New Env" });

    const sourceEnv = selectedEnv;

    const teamId = selectedClient?.id;
    const vars = JSON.parse(sourceEnv?.variablesJSON);

    const newEnv = await qawolf.qawClient.request(gql`
      mutation{
        createEnvironment(name: "${newEnvName}", team_id: "${teamId}") {
          id
        }
      }`
    );

    toast.title = "Duplicating Variables";

    const newId = newEnv.createEnvironment.id;

    for (const [k, v] of Object.entries(vars)) {
      await qawolf.qawClient.request(gql`mutation {
          upsertEnvironmentVariable(environment_id: "${newId}", name: "${k}", value: "${v}") {
            id
          }
        }`);
    }

    await Clipboard.copy(`https://app.qawolf.com/test-client/environments/${newId}`);

    toast.style = Toast.Style.Success;
    toast.title = "Env Created";
    toast.message = "Copied URL to clipboard";
  }

  return (
    <>
      <Form 
        enableDrafts={true}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Create Env" onSubmit={handleSubmit} icon={Icon.PlusCircle}/>
          </ActionPanel>
        }
      >
        {/* Client List */}
        <QawDropdown 
          fieldTitle="Client List"
          setSelectedItem={setSelectedClient}
          setIsLoading={setIsLoading}
          qawQuery={qawolf.getAllClients}/>
        
        {/* Env List */}
        <QawDropdown
          fieldTitle="Env List"
          setSelectedItem={setSelectedEnv}
          updateOn={selectedClient}
          setIsLoading={setIsLoading}
          qawQuery={qawolf.getEnvironmentsByTeam}
          queryVars={selectedClient?.id}
        />

        <Form.TextField id="new-env-name" title="New Env Name" value={newEnvName} onChange={(e) => setNewEnvName(e)} />
      </Form>
    </>
  );
}
