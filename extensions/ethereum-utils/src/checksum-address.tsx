import {
  ActionPanel,
  Form,
  showHUD,
  showToast,
  Action,
  Clipboard,
  Toast,
} from '@raycast/api';
import { getAddress } from 'ethers';

interface Values {
  address: string;
}

export default function Command() {
  function handleSubmit(values: Values) {
    const { address } = values;
    try {
      const checksumAddress = getAddress(address);
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
      const msg = (e as TypeError).message;
      if (msg.startsWith('invalid address')) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Invalid input (not an address)',
        });
        return;
      }
      if (msg.startsWith('bad address checksum')) {
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
