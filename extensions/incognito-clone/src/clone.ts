import { closeMainWindow, showHUD } from '@raycast/api';

import cloneTab from './utils';

const command = async () => {
  try {
    await closeMainWindow();
    await cloneTab();
  } catch (error) {
    console.log(error);
    await showHUD('❌ Cloning tab failed');
  }
};

export default command;
