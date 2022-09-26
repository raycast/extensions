import { Action, ActionPanel, Clipboard, Icon, Form, List, closeMainWindow, popToRoot, showHUD } from "@raycast/api";

import { useState } from "react";

import { Faker, faker } from "@faker-js/faker";

import { GeneratorFormValues, StringIndexableEntity } from "./types";
import { methodPrettyName, xorKeysSorted } from "./utils";

const fakerAPIKeyExclusions = ["definitions", "fake", "locales", "_locale", "_localeFallback"];
const fakerMethodKeyExclusions = ["faker"];

const FakeListGeneratorForm = (props: { method: string | (() => void) }) => {
  const [hasError, setHasError] = useState<string | undefined>(undefined);

  const generate = async (values: GeneratorFormValues) => {
    try {
      const generatedValues = Array.from(Array(parseInt(values.count)))
        .map(() => (typeof props.method === "function" ? props.method() : ""))
        .join("\r\n");

      Clipboard.copy(generatedValues);

      await showHUD(`Copied ${values.count} item${parseInt(values.count) > 1 ? "s" : ""} to the Clipboard`);
      await popToRoot({ clearSearchBar: true });
      await closeMainWindow({ clearRootSearch: true });
    } catch (e) {
      showHUD("Something went wrong. Please try again.");
      console.error(e);
    }
  };

  const dropCountErrorIfNeeded = (value: string | undefined) => {
    if (!value || isNaN(parseInt(value))) {
      setHasError("Valid integer required");
    } else {
      setHasError(undefined);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate" icon={Icon.CopyClipboard} onSubmit={generate} />
        </ActionPanel>
      }
    >
      <Form.Description title="Method" text={methodPrettyName(props.method)} />
      <Form.Separator />
      <Form.TextField
        id="count"
        title={`How many would you like?`}
        defaultValue="1"
        error={hasError}
        onChange={dropCountErrorIfNeeded}
        onBlur={(event) => dropCountErrorIfNeeded(event.target.value)}
      />
    </Form>
  );
};

const FakerList = (props: { items: string[]; root: Faker | StringIndexableEntity | string }) => {
  return (
    <List>
      {props.items.map((fakerKey) => (
        <List.Item
          key={fakerKey}
          title={fakerKey}
          actions={
            <ActionPanel>
              {Object.keys((props.root as StringIndexableEntity)[fakerKey]).length ? (
                <Action.Push
                  title="View Methods"
                  icon={Icon.List}
                  target={
                    <FakerList
                      items={xorKeysSorted(
                        Object.keys((props.root as StringIndexableEntity)[fakerKey]),
                        fakerMethodKeyExclusions
                      )}
                      root={(props.root as StringIndexableEntity)[fakerKey]}
                    />
                  }
                />
              ) : (
                <Action.Push
                  title="Generator"
                  icon={Icon.Shuffle}
                  target={<FakeListGeneratorForm method={(props.root as StringIndexableEntity)[fakerKey]} />}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default function Command() {
  return <FakerList items={xorKeysSorted(Object.keys(faker), fakerAPIKeyExclusions)} root={faker} />;
}
