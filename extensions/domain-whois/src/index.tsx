import { Form, ActionPanel, Action, showToast, Detail } from "@raycast/api";
import { useState } from "react";
import axios from "axios";
import { formatData, formatTitle } from "../utils/format";

type Values = {
  domainField: string;
};

export default function Command() {
  const [domainError, setDomainError] = useState<string | undefined>();
  const [searching, setSearching] = useState<boolean>(false);
  const [whoisData, setWhoisData] = useState<any>(undefined);
  const [currentDomain, setCurrentDomain] = useState<string | undefined>(undefined);

  function checkDomainIfNeeded() {
    if (domainError && domainError.length > 0) {
      setDomainError(undefined);
    }
  }

  function handleSubmit(values: Values) {
    if (!values?.domainField || values.domainField.length == 0) {
      setSearching(false);
      return setDomainError("You must enter a domain name!");
    }

    const regex = new RegExp(/(?:[A-z0-9](?:[A-z0-9-]{0,61}[A-z0-9])?\.)+[A-z0-9][A-z0-9-]{0,61}[A-z0-9]/gmi);
    const domain = values.domainField.match(regex);
    if (!domain || domain.length == 0) {
      setSearching(false);
      return setDomainError("You must enter a valid domain name!");
    }

    const domainName = domain[0];
    if (domainName === currentDomain) {
      return;
    }

    setCurrentDomain(domainName);

    setSearching(true);
    setWhoisData(undefined);

    axios.get(`https://api.phish.gg/fetch/domain/${domainName}`).then((response) => {
      if (response.data?.err) {
        return setDomainError(`Invalid domain name!`);
      }
      setSearching(false);
      setWhoisData(formatData(response.data));
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter a domain name to check it's WHOIS information." />
      <Form.TextField
        id="domainField"
        title="Domain Name"
        placeholder="Enter a domain name."
        error={domainError}
        onChange={checkDomainIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setDomainError("You must enter a domain name!");
          } else {
            checkDomainIfNeeded();
          }
        }}
      />
      <Form.Separator />
      {searching && (
        <Form.Description
          title="Searching..."
          text="Please wait while we search for the domain name."
        />
      )}
      {whoisData && (
        <>
          {whoisData.map((whoisData: any, key: number) => {
            return (
              <Form.Description
                key={key}
                title={formatTitle(whoisData?.key)}
                text={typeof whoisData.value === "string" ? whoisData.value : whoisData.value.join(", ")}
              />
            );
          })}
        </>
      )}
    </Form>
  );
}
