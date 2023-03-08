import {
  ActionPanel,
  Form,
  showHUD,
  showToast,
  Action,
  Clipboard,
  Toast,
} from '@raycast/api';
import { utils } from 'ethers';

interface Values {
  address: string;
}

interface EthersError {
  reason?: string;
}

export default function Command() {
  function handleSubmit(values: Values) {
    const { address } = values;
    try {
      const checksumAddress = utils.getAddress(address);
      if (address === checksumAddress) {
        showToast({
          style: Toast.Style.Success,
          title: 'Valid address (already checksummed)',
        });
        return;
      }
      Clipboard.copy(checksumAddress);
      showHUD('Copied to clipboard');
    } catch (e) {
      const reason = (e as EthersError).reason;
      if (reason === 'invalid address') {
        showToast({
          style: Toast.Style.Failure,
          title: 'Invalid input (not an address)',
        });
        return;
      }
      if (reason === 'bad address checksum') {
        showToast({
          style: Toast.Style.Failure,
          title: 'Invalid address (wrong checksum)',
        });
        return;
      }
      showToast({
        style: Toast.Style.Failure,
        title: 'Unknown error',
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="address" title="Address" />
    </Form>
  );
}
