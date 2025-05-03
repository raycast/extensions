import { ActionPanel, Action, Form, showToast, Toast, LocalStorage, open, Cache } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import * as analytics from "./utils/analytics";
import { StarknetChainId } from "./utils/starknetJsTypes-ti";
import debounce from "debounce";
import { getAbiAllCases } from "./utils/extension/cvmTransactionProvider";
import * as starknet from "starknet";
import { stringifyBigInt } from "./utils/object";
import { COMMON_NUMERIC_TYPES } from "./utils/extension/startknetHardhat";
import starknetConverter from "./utils/starknetConverter.js";

enum STORAGE_VARIABLES {
  CONTRACT_ADDRESS = "contract_address",
  NETWORK = "network",
  GET_IMPLEMENTATION_CONTRACT = "get_implementation_contract",
}
const firtTimeVariableSet: Partial<{ [name in STORAGE_VARIABLES]: boolean }> = {};

const cache = new Cache();

export default function Command() {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [network, setNetwork] = useState<string>("SN_MAIN");
  const [abiResult, setAbiResult] = useState<any>({ error: false });
  const [allFunctions, setAllFunctions] = useState<any>([]);
  const [selectedFunction, setSelectedFunction] = useState<any>(null);
  const [functionArguments, setFunctionArguments] = useState<any>([]);
  const [getImplementationContract, setGetImplementationContract] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [output, setOutput] = useState<any>(null);
  const [argumentValues, setArgumentValues] = useState<any>({});

  const STORAGE_VARIABLES_CONFIG: { [name in STORAGE_VARIABLES]: { setter: any; getter: any } } = {
    [STORAGE_VARIABLES.CONTRACT_ADDRESS]: {
      setter: setContractAddress,
      getter: contractAddress,
    },
    [STORAGE_VARIABLES.NETWORK]: {
      setter: setNetwork,
      getter: network,
    },
    [STORAGE_VARIABLES.GET_IMPLEMENTATION_CONTRACT]: {
      setter: setGetImplementationContract,
      getter: getImplementationContract,
    },
  };

  useEffect(() => {
    analytics.trackEvent("OPEN_STARKNET_TRANSACTION_BUILDER");
  }, []);

  useEffect(() => {
    (async () => {
      // get all variables in STORAGE_VARIABLES_CONFIG from the local storage and set them using the setters
      Object.entries(STORAGE_VARIABLES_CONFIG).forEach(async ([key, value]: [string, any]) => {
        let storageValue = await LocalStorage.getItem(key);
        if (storageValue) {
          if (storageValue === "true" || storageValue === "false") {
            storageValue = JSON.parse(storageValue);
          }
          value.setter(storageValue);
        }
      });
    })();
  }, []);

  const handleStorageVariableChange = async (key: STORAGE_VARIABLES, value: any) => {
    if (!firtTimeVariableSet[key]) {
      // ignore the first time this function is called
      // because it rewrited the storage value we right
      firtTimeVariableSet[key] = true;
      return;
    }

    console.log("setting storage var - ", key, value);
    STORAGE_VARIABLES_CONFIG[key].setter(value);
    await LocalStorage.setItem(key, value);
  };

  const fetchAbi = useCallback(
    debounce(async (network: string, address: string, getImplementationContract: boolean, callback: any) => {
      const toast = await showToast({
        title: "Fetching the ABI",
        style: Toast.Style.Animated,
      });
      setAllFunctions([]);
      setSelectedFunction(null);
      setFunctionArguments([]);
      setOutput(null);
      if (!address) {
        setAbiResult({ abi: false, error: false });
        toast.hide();
        return;
      }
      let response;
      const cacheValue = cache.get(`${network}_${address}_${getImplementationContract}`);
      if (cacheValue) {
        response = JSON.parse(cacheValue);
      } else {
        response = await getAbiAllCases(network, address, getImplementationContract);
        cache.set(`${network}_${address}_${getImplementationContract}`, JSON.stringify(response));
      }

      toast.hide();
      callback(response, address);
    }, 200),
    []
  );

  const setAbi = (response: any, address: string) => {
    if (address !== contractAddress) return;
    setAbiResult(response);
    if (response.error) {
      showToast({
        title: response.error,
        style: Toast.Style.Failure,
      });
      return;
    }
    const functions = response.abi.filter((element: any) => element.type == "function");
    setAllFunctions(functions);
    setSelectedFunction(functions[0]); // setting a write function as the default one
  };

  useEffect(() => {
    fetchAbi(network, contractAddress, getImplementationContract, setAbi);
  }, [contractAddress, network, getImplementationContract]);

  const handleFunctionChange = async (functionName: string) => {
    const f = allFunctions.find((element: any) => element.name === functionName);
    setSelectedFunction(f);
    setFunctionArguments(f.inputs);
    setArgumentValues({});
    setOutput(null);
  };

  const argumentChange = (name: string, value: string) => {
    const newArgs = { ...argumentValues };
    newArgs[name] = value;

    console.log("new args value - ", newArgs);
    setArgumentValues(newArgs);
  };

  const parseFinalResponse = (result: any) => {
    let strResult = stringifyBigInt(result);
    let basic = false;
    if (strResult[0] == '"') {
      strResult = strResult.slice(1, strResult.length - 1); // removing double quotes
      basic = true;
    }

    if (/^\d+$/.test(strResult)) {
      strResult = starknet.num.toHex(strResult);
      basic = true;
    }
    return { str: strResult, basic: basic };
  };

  const getCalldata = () => {
    // remove eslint check in next line
    // eslint-disable-next-line
    // @ts-ignore
    const provider = new starknet.Provider({ sequencer: { network: network } });
    const contract = new starknet.Contract(abiResult.abi, contractAddress, provider);
    const argsArray: any[] = [];
    selectedFunction.inputs.forEach((input: any) => {
      let value = argumentValues[input.name];
      if (input.type === "Uint256") {
        value = starknet.uint256.bnToUint256(value);
      } else if (!COMMON_NUMERIC_TYPES.includes(input.type)) {
        try {
          value = JSON.parse(value);
        } catch (err: any) {
          analytics.trackEvent("FAILED_GET_CALLDATA", {
            value,
            errorMessage: err.message,
          });
          console.error(err);
        }
      }
      argsArray.push(value);
    });

    console.log("this is args array - ", argsArray);

    return { contract, calldata: contract.populate(selectedFunction.name, argsArray), argsArray };
  };

  const callContract = async () => {
    try {
      const data = getCalldata();
      if (selectedFunction.stateMutability === "view") {
        const toast = await showToast({
          title: `Calling ${selectedFunction.name}`,
          style: Toast.Style.Animated,
        });
        const result: any = await data?.contract[selectedFunction.name](...data.argsArray);
        setOutput(parseFinalResponse(result[selectedFunction.outputs[0].name]));
        toast.hide();
        return;
      }

      const url = `https://getcharged.dev/transaction_builder?calldata=${encodeURIComponent(
        JSON.stringify(getCalldata()?.calldata)
      )}`;

      open(url);
    } catch (err: any) {
      console.error(err);
      analytics.trackEvent("FAILED_CALL_CALLDATA", {
        selectedFunction,
        contractAddress,
        errorMessage: err.message,
      });
      showToast({
        title: err.message as string,
        style: Toast.Style.Failure,
      });
      return;
    }
  };

  console.log("this is output - ", output && starknet.shortString.decodeShortString(output.str)?.toString());

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Call Contract" onSubmit={callContract} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="contractAddress"
        key="contractAddress"
        title="Contract Address"
        placeholder="0x310eb89d2caf04734985ba0d9e381f807f83a33238b1cab8edd71fdc5d63936"
        onChange={(value) => handleStorageVariableChange(STORAGE_VARIABLES.CONTRACT_ADDRESS, value)}
        value={contractAddress}
        autoFocus
      />
      <Form.Dropdown
        id="network"
        title="Network"
        value={network}
        onChange={(value) => handleStorageVariableChange(STORAGE_VARIABLES.NETWORK, value)}
      >
        {Object.entries(StarknetChainId.members).map(([key, value]) => (
          <Form.Dropdown.Item key={`network_dropdown_${key}`} value={key} title={key} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="implementationContract"
        label="Automatically fetch implementation contract"
        value={Boolean(getImplementationContract)} // added boolean because when saving to local storage it get's saved as 0/1
        onChange={(value) => handleStorageVariableChange(STORAGE_VARIABLES.GET_IMPLEMENTATION_CONTRACT, value)}
      />
      {allFunctions.length > 0 && (
        <Form.Dropdown id="function" title="Function" onChange={handleFunctionChange} value={selectedFunction.name}>
          <Form.Dropdown.Section title="Write">
            {allFunctions
              .filter((elem: any) => !elem.stateMutability)
              .map((element: any) => (
                <Form.Dropdown.Item
                  key={`network_dropdown_${element.name}`}
                  value={element.name}
                  title={element.name}
                />
              ))}
          </Form.Dropdown.Section>
          <Form.Dropdown.Section title="Read">
            {allFunctions
              .filter((elem: any) => elem.stateMutability === "view")
              .map((element: any) => (
                <Form.Dropdown.Item
                  key={`network_dropdown_${element.name}`}
                  value={element.name}
                  title={element.name}
                />
              ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      )}
      {abiResult.error && <Form.Description title="Error" text={abiResult.error as string} />}
      {functionArguments.map((element: any) => {
        if (COMMON_NUMERIC_TYPES.includes(element.type)) {
          return (
            <Form.TextField
              id={`argument_${element.name}`}
              key={`argument_${element.name}`}
              title={element.name}
              placeholder={element.type}
              onChange={(value) => argumentChange(element.name, value)}
            />
          );
        }
        return (
          <Form.TextArea
            id={`argument_${element.name}`}
            key={`argument_${element.name}`}
            title={element.name}
            placeholder={element.type}
            onChange={(value) => argumentChange(element.name, value)}
          />
        );
      })}
      <Form.Separator />
      {output &&
        (output.basic ? (
          <>
            <Form.TextField
              id={`output_text_area_basic_hex`}
              title="Output Hex"
              placeholder=""
              onChange={() => {
                void 0;
              }}
              value={starknetConverter.toHex(output.str)?.toString()}
            ></Form.TextField>
            <Form.TextField
              id={`output_text_area_basic_string`}
              title="Output String"
              placeholder=""
              onChange={() => {
                void 0;
              }}
              value={starknet.shortString.decodeShortString(output.str)?.toString()}
            ></Form.TextField>
            <Form.TextField
              id={`output_text_area_basic_felt`}
              title="Output Felt"
              placeholder=""
              onChange={() => {
                void 0;
              }}
              value={starknetConverter.toBN(output.str)?.toString()}
            ></Form.TextField>
          </>
        ) : (
          <Form.TextArea
            id={`output_text_area_complex`}
            title="Output"
            placeholder=""
            onChange={() => {
              void 0;
            }}
            value={output.str}
          ></Form.TextArea>
        ))}
    </Form>
  );
}
