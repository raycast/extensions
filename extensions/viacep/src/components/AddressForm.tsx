import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { STATE_CODES } from "../utils/constants";

interface AddressFormProps {
  onSubmit: (values: { uf: string; city: string; streetName: string }) => void;
}

export default function AddressForm({ onSubmit }: AddressFormProps) {
  const [CityError, setCityError] = useState<string | undefined>();
  const [streetNameError, setStreetNameError] = useState<string | undefined>();

  const dropCityError = () => setCityError(undefined);
  const dropStreetNameError = () => setStreetNameError(undefined);

  const handleSubmit = (values: { uf: string; city: string; streetName: string }) => {
    if (!values.city || !values.streetName) {
      if (!values.city) setCityError("Required");
      if (!values.streetName) setStreetNameError("Required");
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
        error={CityError}
        onChange={dropCityError}
        onBlur={(event) => {
          if (!event.target.value) {
            setCityError("Required");
          } else {
            dropCityError();
          }
        }}
      />
      <Form.Dropdown id="uf" title="State Code" defaultValue="SP">
        {STATE_CODES.map((code) => (
          <Form.Dropdown.Item key={code} value={code} title={code} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
