import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { STATE_CODES } from "../utils/constants";

interface AddressFormProps {
  onSubmit: (values: { uf: string; city: string; streetName: string }) => void;
}

export default function AddressForm({ onSubmit }: AddressFormProps) {
  const [cityError, setCityError] = useState<string | undefined>();
  const [streetNameError, setStreetNameError] = useState<string | undefined>();
  const [stateError, setStateError] = useState<string | undefined>();

  const dropCityError = () => setCityError(undefined);
  const dropStreetNameError = () => setStreetNameError(undefined);
  const dropStateError = () => setStateError(undefined);

  const handleSubmit = (values: { uf: string; city: string; streetName: string }) => {
    if (!values.city || !values.streetName || values.uf === "–") {
      if (!values.city) setCityError("Required");
      if (!values.streetName) setStreetNameError("Required");
      if (values.uf === "–") setStateError("Required");
      return;
    }
    onSubmit(values);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Find CEP" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="streetName"
        title="Street Name"
        placeholder="Avenida Paulista"
        error={streetNameError}
        onChange={dropStreetNameError}
        onBlur={(event) => {
          if (!event.target.value) {
            setStreetNameError("Required");
          } else {
            dropStreetNameError();
          }
        }}
      />
      <Form.TextField
        id="city"
        title="City"
        placeholder="São Paulo"
        error={cityError}
        onChange={dropCityError}
        onBlur={(event) => {
          if (!event.target.value) {
            setCityError("Required");
          } else {
            dropCityError();
          }
        }}
      />
      <Form.Dropdown
        id="uf"
        title="State Code"
        error={stateError}
        onChange={dropStateError}
        onBlur={(event) => {
          if (event.target.value === "–") {
            setStateError("Required");
          } else {
            dropStateError();
          }
        }}
      >
        {STATE_CODES.map((code) => (
          <Form.Dropdown.Item key={code} value={code} title={code} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
