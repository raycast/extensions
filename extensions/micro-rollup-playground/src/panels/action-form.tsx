import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { TypedDataDomain, Wallet } from "ethers";
import got from "got";
import { titleCase } from "../utils/helpers";
import { MRU_DOMAIN, PRIVATE_KEY, getFromStore, getFromStoreOrDefault } from "../utils/storage";
import { Schema } from "../utils/types";

export const ActionForm = (props: { apiUrl: string; transitionName: string; schema: Schema | undefined }) => {
  const { apiUrl, transitionName, schema } = props;
  const nav = useNavigation();

  const fields = Object.values(schema?.types || {})[0];

  const submitAction = async (values: Record<string, unknown>) => {
    const privateKey = await getFromStoreOrDefault<string>(PRIVATE_KEY, "");
    const wallet = new Wallet(privateKey);
    const msgSender = wallet.address;
    const domain = await getFromStore<TypedDataDomain>(MRU_DOMAIN);
    if (!schema || !wallet) {
      return;
    }
    const inputs = fields.reduce(
      (acc, field) => {
        const value = values[field.name];
        if (field.type === "uint256") {
          acc[field.name] = Number(value);
        } else if (field.type === "bool") {
          acc[field.name] = value === "true" || value === true;
        } else {
          acc[field.name] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );

    const signature = await wallet?.signTypedData(domain, schema.types, inputs);
    const json = {
      payload: {
        signature,
        msgSender,
        inputs,
      },
      schemaIdentifier: schema.identifier,
    };

    try {
      await got.post(`${apiUrl}/interact/${transitionName}`, {
        json,
        responseType: "json",
      });
      showToast({
        style: Toast.Style.Success,
        title: "Transaction submitted",
      });
      nav.pop();
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to submit transaction",
      });
    }
  };

  const { handleSubmit, itemProps } = useForm({
    async onSubmit(values: Record<string, unknown>) {
      await submitAction(values);
    },
    validation: fields.reduce(
      (acc, field) => {
        acc[field["name"]] = FormValidation.Required;
        return acc;
      },
      {} as Record<string, FormValidation>,
    ),
  });

  const renderField = (field: { name: string; type: string }) => {
    if (field.type === "bool") {
      return (
        <Form.Checkbox
          key={field["name"]}
          id={field["name"]}
          error={itemProps[field["name"]].error}
          label={"Check to enable"}
          title={titleCase(field["name"])}
        />
      );
    }

    return (
      <Form.TextField
        key={field["name"]}
        id={field["name"]}
        error={itemProps[field["name"]].error}
        title={titleCase(field["name"])}
        placeholder={field["type"]}
      />
    );
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Upload} title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {fields.map((field) => renderField(field))}
    </Form>
  );
};
