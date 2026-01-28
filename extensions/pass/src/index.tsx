import { join } from 'path';
import Store from './store';
import checkInstall from './checkInstall';

const DEFAULT_PATH = join(process.env.HOME || '', '.password-store');

export default function Command() {
  checkInstall();

  return <Store storepath={DEFAULT_PATH} />;
}
