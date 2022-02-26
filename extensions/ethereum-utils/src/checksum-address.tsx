import {
  ActionPanel,
  copyTextToClipboard,
  Form,
  showHUD,
  showToast,
  SubmitFormAction,
  ToastStyle,
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
        showToast(ToastStyle.Success, 'Valid address (already checksummed)');
        return;
      }
      copyTextToClipboard(checksumAddress);
      showHUD('Copied to clipboard');
    } catch (e) {
      const reason = (e as EthersError).reason;
      if (reason === 'invalid address') {
        showToast(ToastStyle.Failure, 'Invalid input (not an address)');
        return;
      }
      if (reason === 'bad address checksum') {
        showToast(ToastStyle.Failure, 'Invalid address (wrong checksum)');
        return;
      }
      showToast(ToastStyle.Failure, 'Unknown error');
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="address" title="Address" />
    </Form>
  );
}
