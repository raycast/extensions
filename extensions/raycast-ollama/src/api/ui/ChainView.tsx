import { Action, ActionPanel, Form, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React from "react";
import { Chains, ChainPreferences } from "../types";

interface SubmitFormData {
  ChainType: string;
  ChainParameterDocsNumber?: string;
}

interface props {
  ShowChainView: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Return JSX Element for Chain View
 * @param {props} props
 * @returns
 */
export function ChainView(props: props): JSX.Element {
  const { data: ChainPreferences } = usePromise(GetChainPreferences);
  const [ChainType, setChainType] = React.useState(Chains.STUFF as string);
  const [Error, setError]: [string | undefined, React.Dispatch<React.SetStateAction<string | undefined>>] =
    React.useState();
  const ChainInfo = new Map([
    [
      Chains.STUFF,
      'The stuff documents chain ("stuff" as in "to stuff" or "to fill") is the most straightforward of the document chains. It takes a list of documents, inserts them all into a prompt and passes that prompt to an LLM.\n\nThis chain is well-suited for applications where documents are small and only a few are passed in for most calls.',
    ],
    [
      Chains.REFINE,
      "The refine documents chain constructs a response by looping over the input documents and iteratively updating its answer. For each document, it passes all non-document inputs, the current document, and the latest intermediate answer to an LLM chain to get a new answer.\n\nSince the Refine chain only passes a single document to the LLM at a time, it is well-suited for tasks that require analyzing more documents than can fit in the model's context. The obvious tradeoff is that this chain will make far more LLM calls than, for example, the Stuff documents chain. There are also certain tasks which are difficult to accomplish iteratively. For example, the Refine chain can perform poorly when documents frequently cross-reference one another or when a task requires detailed information from many documents.",
    ],
  ]);

  const InfoChainParameterDocsNumber =
    "For fitting the context window document are spitted in chunks. This value indicate how many chunks will be passed to the LLM. High value can produce better response but increase inference time.";

  /**
   * Get Chain Preferences.
   * @returns {Promise<ChainSettings | undefined>} Chain Settings.
   */
  async function GetChainPreferences(): Promise<ChainPreferences | undefined> {
    const json = await LocalStorage.getItem(`chain_settings`);
    if (json) {
      const chain: ChainPreferences = JSON.parse(json as string);
      if (chain.type) setChainType(chain.type);
      return chain;
    }
  }

  /**
   * Validate Chain Parameter Docs Number.
   * @param {string} value.
   */
  function ValidateChainParameterDocsNumber(value: string) {
    const error = "Must be a number";
    if (value === "" || !Number(value)) {
      setError(error);
    } else {
      setError(undefined);
    }
  }

  /**
   * Validate Form.
   */
  function ValidateForm() {
    if (Error && ChainType === Chains.STUFF) setError(undefined);
  }

  /**
   * Save to LocalStorage.
   * @param {SubmitFormData} value.
   */
  function SaveToLocalStorageAndQuit(value: SubmitFormData) {
    let data: ChainPreferences | undefined;
    if (ChainType === Chains.STUFF) {
      data = {
        type: Chains.STUFF,
      };
    } else if (ChainType === Chains.REFINE) {
      data = {
        type: Chains.REFINE,
        parameter: {
          docsNumber: Number(Number(value.ChainParameterDocsNumber).toFixed(0)),
        },
      };
    }
    if (data) LocalStorage.setItem(`chain_settings`, JSON.stringify(data));
    props.ShowChainView(false);
  }

  React.useEffect(() => {
    if (ChainPreferences?.type) setChainType(ChainPreferences.type as string);
  }, [ChainPreferences]);

  React.useEffect(() => {
    ValidateForm();
  }, [ChainType]);

  return (
    <Form
      actions={
        <ActionPanel>
          {!Error ? <Action.SubmitForm title="Save" onSubmit={SaveToLocalStorageAndQuit} /> : null}
          <Action.SubmitForm
            title="Close"
            onSubmit={() => {
              props.ShowChainView(false);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="ChainType"
        title="Chain Type"
        storeValue={true}
        onChange={(newValue) => setChainType(newValue)}
      >
        {Object.values(Chains).map((chain) => {
          return <Form.Dropdown.Item key={chain} value={chain} title={chain} />;
        })}
      </Form.Dropdown>
      {ChainType === Chains.REFINE ? (
        <Form.TextField
          id="ChainParameterDocsNumber"
          title="Documents Chunks"
          info={InfoChainParameterDocsNumber}
          defaultValue={ChainPreferences?.parameter?.docsNumber ? String(ChainPreferences.parameter.docsNumber) : "5"}
          onChange={ValidateChainParameterDocsNumber}
          error={Error}
        />
      ) : null}
      <Form.Description text={ChainInfo.get(ChainType as Chains) as string} />
    </Form>
  );
}
