import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Config } from "../types";
import Top from "./top";
import { loadConfig, saveConfig } from "../utils";
import { useCachedPromise } from "@raycast/utils";

const EditConfig = () => {
  const { data: initialConfig } = useCachedPromise(loadConfig);

  if (!initialConfig) return null;
  return <EditConfigInner initialConfig={initialConfig} />;
};

const EditConfigInner = ({ initialConfig }: { initialConfig: Config }) => {
  const { push } = useNavigation();
  const [baseUrlError, setBaseUrlError] = useState<string | undefined>();
  const [nameFilterRegExpError, setNameFilterRegExpError] = useState<string | undefined>();

  const validateBaseError = (value: string) => {
    if (validateUrl(value)) {
      if (baseUrlError && baseUrlError.length > 0) {
        setBaseUrlError(undefined);
      }
    } else {
      setBaseUrlError("Invalid URL");
    }
  };

  const validateNameFilterRegExpError = (value: string) => {
    if (validateRegExp(value)) {
      if (nameFilterRegExpError && nameFilterRegExpError.length > 0) {
        setNameFilterRegExpError(undefined);
      }
    } else {
      setNameFilterRegExpError("Invalid RegExp");
    }
  };

  const onSubmit = async (config: Config) => {
    await saveConfig(config);
    push(<Top />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Config" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="baseUrl"
        title="Storybook Server Base URL"
        placeholder="http://localhost:6006"
        defaultValue={initialConfig.baseUrl}
        error={baseUrlError}
        onChange={validateBaseError}
        onBlur={(event) => validateBaseError(event?.target.value ?? "")}
      />
      <Form.TextField
        id="nameFilterRegExp"
        title="RegExp to filter component names"
        placeholder="^Docs$"
        defaultValue={initialConfig.nameFilterRegExp}
        error={nameFilterRegExpError}
        onChange={validateNameFilterRegExpError}
        onBlur={(event) => validateNameFilterRegExpError(event?.target.value ?? "")}
      />
    </Form>
  );
};

const validateUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const validateRegExp = (regExp: string) => {
  try {
    new RegExp(regExp);
    return true;
  } catch {
    return false;
  }
};

export default EditConfig;
