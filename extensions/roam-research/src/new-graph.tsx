import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useGraphConfigCache, saveGraphAllBlocks } from "./cache";
import { graphApi, graphApiInitial } from "./roamApi";

const showLoading = (msg: string) => {
  showToast({
    title: msg,
    style: Toast.Style.Animated,
  });
};
const showFailure = (title: string, msg: string) => {
  showToast({
    title: title,
    message: msg,
    style: Toast.Style.Failure,
  });
};

const showGraphValidateFailure = (msg: string) => {
  showFailure("Failure", msg);
};

function checkGraphValid(graphName: string, token: string) {
  return graphApi(graphName, token).q("[:find ?e . :where [?e :block/uid]]");
}

export function NewGraph() {
  const [nameError, setNameError] = useState<string | undefined>();
  const [graphCache, saveGraphCache] = useGraphConfigCache();

  function graphNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  const [tokenError, setTokenError] = useState<string | undefined>();

  function tokenNameErrorIfNeeded() {
    if (tokenError && tokenError.length > 0) {
      setTokenError(undefined);
    }
  }
  console.log(graphCache, " = cache");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Graph"
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
              showLoading("Graph validating");

              try {
                const response = await checkGraphValid(
                  values.nameField || "thoughtfull",
                  values.tokenField || "roam-graph-token-qqBDiLUAK_CUh_zbEMIz40gdnLEOJ"
                );

                const api = graphApiInitial(values.nameField, values.tokenField);
                api.getAllBlocks().then((response) => {
                  saveGraphAllBlocks(values.nameField, response.result);
                  saveGraphCache(values as CachedGraph);

                  showToast({
                    title: `${values.nameField} was added!`,
                    style: Toast.Style.Success,
                  });
                });
              } catch (e: any) {
                // showFailure(e.message);
                showGraphValidateFailure(e.message);
                console.log("e, ", e);
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
        onChange={tokenNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            tokenNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="tokenField"
        title="Token"
        placeholder="Enter graph token"
        error={nameError}
        onChange={graphNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setTokenError("The field should't be empty!");
          } else {
            graphNameErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}

export default NewGraph;
