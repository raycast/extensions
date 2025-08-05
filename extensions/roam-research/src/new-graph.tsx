import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useGraphsConfig } from "./utils";
import * as roamApiSdk from "./roam-api-sdk-copy";
import { initRoamBackendClient } from "./roamApi";

// TODO: handle cases where read token but trying to write. Maybe we want to save read/edit value in cache or maybe handle errors properly when permission denied

function checkGraphValid(graphName: string, token: string) {
  return roamApiSdk.q(initRoamBackendClient(graphName, token), "[:find ?e . :where [?e :block/uid]]");
  // return graphApi(graphName, token).q("[:find ?e . :where [?e :block/uid]]");
}

export function NewGraph() {
  const { graphsConfig, saveGraphConfig } = useGraphsConfig();
  const { pop } = useNavigation();

  const [nameError, setNameError] = useState<string | undefined>();
  function dropGraphNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  const [tokenError, setTokenError] = useState<string | undefined>();
  function dropGraphTokenErrorIfNeeded() {
    if (tokenError && tokenError.length > 0) {
      setTokenError(undefined);
    }
  }
  // console.log(graphsConfig, " = graphsConfig");
  return (
    // TODO: add a description of how to get roam graph tokens for graphs
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Graph"
            onSubmit={async (values) => {
              if (!values["nameField"]) {
                showToast({
                  title: "Warning",
                  message: `Graph name shouldn't be empty!`,
                  style: Toast.Style.Failure,
                });
                return;
              }
              if (!values["tokenField"]) {
                showToast({
                  title: "Warning",
                  message: `Graph token shouldn't be empty!`,
                  style: Toast.Style.Failure,
                });
                return;
              }

              const graphName = values.nameField;
              const graphToken = values.tokenField;

              const toast = await showToast({
                title: "Validating graph",
                style: Toast.Style.Animated,
              });

              try {
                // throws error if graph is not valid
                await checkGraphValid(graphName, graphToken);

                saveGraphConfig(values as GraphConfig);

                toast.style = Toast.Style.Success;
                toast.title = `Graph "${graphName}" was added!`;
                toast.message = "All ready for use!";

                pop();
              } catch (error: any) {
                console.log("error, ", error);

                toast.style = Toast.Style.Failure;
                toast.title = 'Failed to validate graph "' + graphName + '"';
                // TODO: handle common cases of error
                // TODO: might want to make this message smaller so that it appears fully in the toast
                toast.message = "Please check name and token and try again.";
                // toast.message = String(error);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Full Name"
        placeholder="Enter graph name"
        error={nameError}
        onChange={dropGraphNameErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (value && value.length > 0) {
            if (Object.prototype.hasOwnProperty.call(graphsConfig, value)) {
              // if this graph has already been set up
              // another alternative might be to replace old token if one does this. Might actually be the more common use case. THink about it
              //   currently the way one would do it is to remove the graph from the "Roam Research" command and then "Add Graph" again
              setNameError(`"${value}" is already set up!`);
            } else {
              dropGraphNameErrorIfNeeded();
            }
          } else {
            setNameError("The field should't be empty!");
          }
        }}
      />
      <Form.TextField
        id="tokenField"
        title="Token"
        placeholder="Enter graph token"
        error={tokenError}
        onChange={dropGraphTokenErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (value && value.length > 0) {
            // TODO: test if the graph token starts with roam-graph-token-, otherwise it is probably invalid
            dropGraphTokenErrorIfNeeded();
          } else {
            setTokenError("The field should't be empty!");
          }
        }}
      />
    </Form>
  );
}

export default NewGraph;
