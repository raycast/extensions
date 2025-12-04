import { Action, ActionPanel, Form, LaunchType, launchCommand } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect } from "react";

import useContext from "./useContext";
import useOptions from "./useOptions";
import useRecipients from "./useRecipients";

import type { Domain, Format } from "./api";

type Form = {
  description?: string;
  domain: string;
  format: string;
  local_part?: string;
  recipients_ids?: string[];
};

const FORMATS = ["custom", "random_characters", "random_words", "uuid"] as const;

const TRANSLATIONS = {
  custom: "Custom",
  random_characters: "Random Characters",
  random_words: "Random Words",
  uuid: "UUID",
};

const CreateAlias = () => {
  const context = useContext();
  const options = useOptions();
  const recipients = useRecipients();

  const { handleSubmit, itemProps, setValidationError, setValue, values } = useForm<Form>({
    initialValues: {
      domain: options.data?.defaultAliasDomain,
      format: options.data?.defaultAliasFormat,
    },
    async onSubmit(input) {
      if (input.format === "custom" && (input.local_part?.length ?? 0) < 1) {
        setValidationError("local_part", "Local part must be at least 1 character");

        return;
      }

      const values = { ...input, description: input.description === "" ? context.data : input.description };

      await launchCommand({
        context: values,
        name: "generate-alias",
        type: LaunchType.UserInitiated,
      });
    },
    validation: {
      format: (value) => {
        if (!FORMATS.includes(value as Format)) {
          return "Invalid format";
        }
      },
    },
  });

  const isLoading = context.isLoading || !options.data || !recipients.data;

  useEffect(() => {
    if (options.data?.defaultAliasDomain) {
      setValue("domain", options.data.defaultAliasDomain);
    }

    if (options.data?.defaultAliasFormat) {
      setValue("format", options.data.defaultAliasFormat);
    }
    // We don't want to set (again) the default values when the response is the same (due to revalidation)
  }, [JSON.stringify(options.data), setValue]);

  return (
    <Form
      actions={
        !isLoading && (
          <ActionPanel>
            <Action.SubmitForm title="Create Alias" onSubmit={handleSubmit} />
          </ActionPanel>
        )
      }
      isLoading={isLoading}
    >
      {isLoading ? (
        <Form.Description text="Loading your preferences..." />
      ) : (
        <>
          <Form.Dropdown {...itemProps.domain} title="Domain">
            {options.data?.data.map((domain) => <Form.Dropdown.Item key={domain} title={domain} value={domain} />)}
          </Form.Dropdown>
          <Form.Dropdown {...itemProps.format} title="Format">
            {FORMATS.filter(
              (format) => !options.data?.sharedDomains.includes((values.domain as Domain) ?? "") || format !== "custom",
            ).map((format) => (
              <Form.Dropdown.Item key={format} title={TRANSLATIONS[format]} value={format} />
            ))}
          </Form.Dropdown>
          {values.format === "custom" && (
            <Form.TextField
              {...itemProps.local_part}
              info="Specify the local part of the email alias. For example, 'my_custom' will create 'my_custom@domain.tld'."
              placeholder="Enter custom alias"
              title="Custom Alias"
            />
          )}
          <Form.TextField
            {...itemProps.description}
            info="Optional description for the alias."
            placeholder={context.data ?? ""}
            title="Description"
          />
          <Form.TagPicker
            {...itemProps.recipients_ids}
            info="Optional: Select recipient(s) for the alias."
            placeholder="Select recipient(s)"
            title="Recipients"
          >
            {(recipients.data ?? []).map((recipient) => (
              <Form.TagPicker.Item key={recipient.id} title={recipient.email} value={recipient.id} />
            ))}
          </Form.TagPicker>
        </>
      )}
    </Form>
  );
};

export default CreateAlias;
