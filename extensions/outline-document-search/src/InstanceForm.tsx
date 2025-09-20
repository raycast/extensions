import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useLocalStorage } from "@raycast/utils";
import { Instance } from "./queryInstances";
import queryAuthentication from "./queryAuthentication";
import { useAsync } from "react-use";

const useValidation = (initialValue: string, validate: (value: string) => Promise<string | undefined>) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | undefined>();

  const validateValue = async (value: string) => {
    const errorMessage = await validate(value);
    setError(errorMessage);
  };

  useAsync(async () => {
    await validateValue(value);
  }, [value]);

  return {
    value,
    error,
    setValue,
    validateValue,
  };
};

const InstanceForm = ({
  instance,
  onAdd,
  onEdit,
}: {
  instance?: Instance;
  onAdd?: () => Promise<void>;
  onEdit?: () => Promise<void>;
}) => {
  const { pop } = useNavigation();
  const { value: instances, setValue: setInstances } = useLocalStorage<Instance[]>("instances");

  const isEditing = instance !== undefined && onEdit !== undefined;

  const validateAPIKey = async (apiKey: string) => {
    if (!apiKey) {
      return "Please set an API key!";
    } else if (apiKey.trim().length === 0) {
      return "The API key cannot be empty!";
    }

    const authentication = await queryAuthentication({ apiKey, name, url });

    if (!authentication) {
      return "The URL or the API key are invalid!";
    }

    return undefined;
  };
  const validateName = async (name: string) => {
    if (!name) {
      return "Please set a name!";
    } else if (name.trim().length === 0) {
      return "The name cannot be empty!";
    } else if (!isEditing && instances?.find((instance) => instance.name === name)) {
      return "This name is already in use!";
    }

    return undefined;
  };
  const validateURL = async (url: string) => {
    if (!url) {
      return "Please set a URL!";
    } else if (url.trim().length === 0) {
      return "The URL cannot be empty!";
    }

    try {
      new URL(url);
    } catch (error) {
      return "The URL is invalid!";
    }

    await setAPIKeyError(apiKey);

    return undefined;
  };

  const {
    value: apiKey,
    error: apiKeyError,
    setValue: setAPIKey,
    validateValue: setAPIKeyError,
  } = useValidation(instance?.apiKey ?? "", validateAPIKey);
  const {
    value: name,
    error: nameError,
    setValue: setName,
    validateValue: setNameError,
  } = useValidation(instance?.name ?? "", validateName);
  const {
    value: url,
    error: urlError,
    setValue: setURL,
    validateValue: setURLError,
  } = useValidation(instance?.url ?? "", validateURL);

  useAsync(async () => {
    await setNameError(name);
    await setURLError(url);
    await setAPIKeyError(apiKey);
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={() => {
              let nextInstances = [...(instances ?? []), { apiKey, name, url }];

              if (isEditing && instances) {
                const currentInstanceIndex = instances.findIndex(
                  (existingInstance) => existingInstance.name === instance.name,
                );

                instances[currentInstanceIndex] = { apiKey, name, url };
                nextInstances = [...instances];
              }

              setInstances(nextInstances.sort((first, second) => first.name.localeCompare(second.name))).then(
                async () => {
                  pop();

                  if (isEditing) {
                    if (onEdit) await onEdit();
                  } else {
                    if (onAdd) await onAdd();
                  }
                },
              );
            }}
            title={isEditing ? "Save" : "Add"}
          />
        </ActionPanel>
      }
      navigationTitle={isEditing ? "Edit Instance" : "Create Instance"}
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://www.getoutline.com/developers#section/Authentication"
          text="Open Documentation"
        ></Form.LinkAccessory>
      }
    >
      <Form.TextField
        autoFocus
        defaultValue={name}
        error={nameError}
        id="name"
        placeholder="Personal"
        onBlur={async (event) => await setNameError(event.target.value!)}
        onChange={async (value) => {
          setName(value);

          await setNameError(value);
        }}
        title="Name"
      ></Form.TextField>
      <Form.TextField
        defaultValue={url}
        error={urlError}
        id="url"
        placeholder="https://app.getoutline.com"
        onBlur={async (event) => await setURLError(event.target.value!)}
        onChange={async (value) => {
          // Ease concatenation by removing trailing slashes
          if (value.endsWith("/")) value = value.slice(0, -1);

          setURL(value);

          await setURLError(value);
        }}
        title="URL"
      ></Form.TextField>
      <Form.PasswordField
        defaultValue={apiKey}
        error={apiKeyError}
        id="apiKey"
        placeholder="ol_api_..."
        onBlur={async (event) => await setAPIKeyError(event.target.value!)}
        onChange={async (value) => {
          setAPIKey(value);

          await setAPIKeyError(value);
        }}
        title="API Key"
      ></Form.PasswordField>
    </Form>
  );
};

export default InstanceForm;
