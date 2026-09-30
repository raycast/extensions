import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios from "axios";
import { useState } from "react";
import { useAPIKey } from "@src/hooks";
import APIResult from "@src/components/APIResult";

export default () => {
  const { push } = useNavigation();
  const apiKey = useAPIKey();
  const [endpointError, setEndpointError] = useState<string | undefined>();
  const dropEndpointErrorIfNeeded = () => {
    if (endpointError && endpointError.length > 0) {
      setEndpointError(undefined);
    }
  };

  return (
    <Form
      navigationTitle="Test SportMonks API"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Request"
            icon={Icon.Rocket}
            onSubmit={async (values) => {
              try {
                const { url } = values;
                const response = await axios({
                  method: "GET",
                  url,
                  headers: { Authorization: apiKey },
                });
                await showToast({
                  title: "Success!",
                  message: "Rendering Response...",
                  style: Toast.Style.Success,
                });
                push(<APIResult response={response} url={url} />);
              } catch (error) {
                showFailureToast(error);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="API Test"
        text="To test the validity of your access token, make an API call using a SportMonks API endpoint (V3). For documentation on endpoints please visit https://docs.sportmonks.com/football/welcome/getting-started"
      />
      <Form.TextField
        autoFocus
        id="url"
        title="URL"
        placeholder="https://api.sportmonks.com/v3/some_path_here"
        error={endpointError}
        onChange={(endpoint) => {
          const endpointRegex =
            /^https:\/\/api\.sportmonks\.com\/v3\/football\/.*/g;
          if (!endpoint.match(endpointRegex)) {
            setEndpointError("SportMonks URL not valid!");
          } else {
            dropEndpointErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
};
